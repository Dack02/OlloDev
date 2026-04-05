import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  createTicketSchema,
  updateTicketSchema,
  assignTicketSchema,
  satisfactionSchema,
} from '@ollo-dev/shared/validators';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  badRequest,
  forbidden,
  notFound,
  internalError,
} from '../../lib/errors.js';
import {
  sendEmailAsync,
  isNotificationEnabled,
  getUserEmail,
  getUserDisplayName,
} from '../../services/email.js';
import { renderTicketCreated } from '../../emails/ticket-created.js';
import { renderTicketStatusUpdated } from '../../emails/ticket-status-updated.js';
import { renderTicketAssigned } from '../../emails/ticket-assigned.js';
import { renderTicketResolved } from '../../emails/ticket-resolved.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

app.use('/*', authMiddleware);

// ============================================================
// Helpers
// ============================================================

async function verifyOrgMembership(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function isAgentOrAbove(role: string): boolean {
  return ['owner', 'admin', 'agent'].includes(role);
}

// Calculate SLA deadlines (minutes -> ISO datetime)
function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

// ============================================================
// GET / — List tickets
// ============================================================
const listTicketsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Tickets'],
  summary: 'List tickets for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    query: z.object({
      status: z.string().optional(),
      priority: z.string().optional(),
      assignee_id: z.string().uuid().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
  },
  responses: {
    200: {
      description: 'List of tickets',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(z.any()),
            next_cursor: z.string().nullable(),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(listTicketsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { status, priority, assignee_id, cursor, limit } = c.req.valid('query');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  let query = supabase
    .from('tickets')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  // Customers see only their own tickets
  if (!isAgentOrAbove(membership.role)) {
    query = query.eq('requester_id', user.id);
  }

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (assignee_id) query = query.eq('assignee_id', assignee_id);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: tickets, error } = await query;
  if (error) return internalError(c, error.message);

  const items = tickets ?? [];
  let next_cursor: string | null = null;

  if (items.length > limit) {
    const last = items.pop();
    next_cursor = last?.created_at ?? null;
  }

  return c.json({ data: items, next_cursor });
});

// ============================================================
// POST / — Create ticket
// ============================================================
const createTicketRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Tickets'],
  summary: 'Create a new ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: createTicketSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Ticket created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(createTicketRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const now = new Date();
  let sla_breach_at: string | null = null;
  let due_at: string | null = null;

  // If a queue is provided, look up its SLA policy and calculate deadlines
  if (body.queue_id) {
    const { data: queue } = await supabase
      .from('ticket_queues')
      .select('sla_policy_id')
      .eq('id', body.queue_id)
      .maybeSingle();

    if (queue?.sla_policy_id) {
      const { data: sla } = await supabase
        .from('sla_policies')
        .select('response_times, resolution_times')
        .eq('id', queue.sla_policy_id)
        .maybeSingle();

      if (sla) {
        const priority = body.priority ?? 'normal';
        const firstResponseMinutes = (sla.response_times as Record<string, number>)[priority];
        const resolutionMinutes = (sla.resolution_times as Record<string, number>)[priority];

        if (firstResponseMinutes) sla_breach_at = addMinutes(now, firstResponseMinutes);
        if (resolutionMinutes) due_at = addMinutes(now, resolutionMinutes);
      }
    }
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      org_id: orgId,
      requester_id: user.id,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
      type: body.type,
      queue_id: body.queue_id ?? null,
      tags: body.tags,
      custom_fields: body.custom_fields,
      sla_breach_at,
      due_at,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Fire-and-forget: email the requester that their ticket was created
  (async () => {
    if (await isNotificationEnabled(orgId, 'ticket_created')) {
      const email = await getUserEmail(user.id);
      const name = await getUserDisplayName(user.id);
      if (email) {
        sendEmailAsync(orgId, {
          to: email,
          subject: `Ticket received: ${body.subject}`,
          html: renderTicketCreated({
            ticketSubject: body.subject,
            ticketId: ticket.id,
            requesterName: name,
          }),
          tags: [{ name: 'type', value: 'ticket_created' }],
        });
      }
    }
  })();

  return c.json({ data: ticket }, 201);
});

// ============================================================
// GET /:ticketId — Get single ticket
// ============================================================
const getTicketRoute = createRoute({
  method: 'get',
  path: '/:ticketId',
  tags: ['Tickets'],
  summary: 'Get a single ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Ticket details',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(getTicketRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) return internalError(c, error.message);
  if (!ticket) return notFound(c, 'Ticket not found');

  // Customers can only view their own tickets
  if (!isAgentOrAbove(membership.role) && ticket.requester_id !== user.id) {
    return forbidden(c, 'You do not have access to this ticket');
  }

  return c.json({ data: ticket });
});

// ============================================================
// PATCH /:ticketId — Update ticket
// ============================================================
const updateTicketRoute = createRoute({
  method: 'patch',
  path: '/:ticketId',
  tags: ['Tickets'],
  summary: 'Update a ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: updateTicketSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Ticket updated',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(updateTicketRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: existing, error: fetchErr } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Ticket not found');

  // Customers can only access their own tickets and only update subject/description
  if (!isAgentOrAbove(membership.role)) {
    if (existing.requester_id !== user.id) {
      return forbidden(c, 'You do not have access to this ticket');
    }
    const allowedKeys = ['subject', 'description'];
    const disallowedKeys = Object.keys(body).filter((k) => !allowedKeys.includes(k));
    if (disallowedKeys.length > 0) {
      return forbidden(c, 'Customers can only update subject and description');
    }
  }

  const previousStatus = existing.status;
  const newStatus = body.status;

  const { data: ticket, error } = await supabase
    .from('tickets')
    .update(body)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Record status change in ticket_activity
  if (newStatus && newStatus !== previousStatus) {
    await supabase.from('ticket_activity').insert({
      ticket_id: ticketId,
      actor_id: user.id,
      action: 'status_changed',
      metadata: { from: previousStatus, to: newStatus },
    });

    // Fire-and-forget: email the requester about the status change
    (async () => {
      const isResolved = newStatus === 'resolved';
      const notifType = isResolved ? 'ticket_resolved' : 'ticket_status_changed';

      if (await isNotificationEnabled(orgId, notifType)) {
        const email = await getUserEmail(existing.requester_id);
        const name = await getUserDisplayName(existing.requester_id);
        if (email) {
          if (isResolved) {
            sendEmailAsync(orgId, {
              to: email,
              subject: `Ticket resolved: ${existing.subject}`,
              html: renderTicketResolved({
                ticketSubject: existing.subject,
                ticketId,
                requesterName: name,
              }),
              tags: [{ name: 'type', value: 'ticket_resolved' }],
            });
          } else {
            sendEmailAsync(orgId, {
              to: email,
              subject: `Ticket updated: ${existing.subject}`,
              html: renderTicketStatusUpdated({
                ticketSubject: existing.subject,
                ticketId,
                requesterName: name,
                previousStatus,
                newStatus,
              }),
              tags: [{ name: 'type', value: 'ticket_status_changed' }],
            });
          }
        }
      }
    })();
  }

  return c.json({ data: ticket });
});

// ============================================================
// POST /:ticketId/assign — Assign ticket
// ============================================================
const assignTicketRoute = createRoute({
  method: 'post',
  path: '/:ticketId/assign',
  tags: ['Tickets'],
  summary: 'Assign a ticket to an agent',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: assignTicketSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Ticket assigned',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(assignTicketRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const { assignee_id } = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');
  if (!isAgentOrAbove(membership.role)) {
    return forbidden(c, 'Only agents, admins, and owners can assign tickets');
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, assignee_id')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!existing) return notFound(c, 'Ticket not found');

  const previousAssignee = existing.assignee_id;

  const { data: ticket, error } = await supabase
    .from('tickets')
    .update({ assignee_id })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Record assignment in ticket_activity
  await supabase.from('ticket_activity').insert({
    ticket_id: ticketId,
    actor_id: user.id,
    action: 'assigned',
    metadata: { from: previousAssignee, to: assignee_id },
  });

  // Fire-and-forget: email the new assignee
  if (assignee_id) {
    (async () => {
      if (await isNotificationEnabled(orgId, 'ticket_assigned')) {
        const assigneeEmail = await getUserEmail(assignee_id);
        const assigneeName = await getUserDisplayName(assignee_id);
        const actorName = await getUserDisplayName(user.id);
        if (assigneeEmail) {
          sendEmailAsync(orgId, {
            to: assigneeEmail,
            subject: `Ticket assigned: ${ticket.subject}`,
            html: renderTicketAssigned({
              ticketSubject: ticket.subject,
              ticketId,
              assigneeName,
              assignedBy: actorName,
              priority: ticket.priority ?? 'normal',
            }),
            tags: [{ name: 'type', value: 'ticket_assigned' }],
          });
        }
      }
    })();
  }

  return c.json({ data: ticket });
});

// ============================================================
// POST /:ticketId/satisfaction — Submit satisfaction rating
// ============================================================
const satisfactionRoute = createRoute({
  method: 'post',
  path: '/:ticketId/satisfaction',
  tags: ['Tickets'],
  summary: 'Submit a satisfaction rating for a resolved ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: satisfactionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Satisfaction rating submitted',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(satisfactionRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const { rating, comment } = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, requester_id, status')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);
  if (!ticket) return notFound(c, 'Ticket not found');

  // Only the requester can rate
  if (ticket.requester_id !== user.id) {
    return forbidden(c, 'Only the ticket requester can submit a satisfaction rating');
  }

  // Only for resolved or closed tickets
  if (!['resolved', 'closed'].includes(ticket.status)) {
    return badRequest(c, 'Satisfaction ratings can only be submitted for resolved or closed tickets');
  }

  const { data: updated, error } = await supabase
    .from('tickets')
    .update({
      satisfaction_rating: rating,
      satisfaction_comment: comment ?? null,
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  return c.json({ data: updated });
});

export default app;
