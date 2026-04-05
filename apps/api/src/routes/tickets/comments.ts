import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createTicketCommentSchema } from '@ollo-dev/shared/validators';
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
import { renderTicketComment } from '../../emails/ticket-comment.js';

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

// ============================================================
// GET / — List comments for a ticket
// ============================================================
const listCommentsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Ticket Comments'],
  summary: 'List comments for a ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'List of comments',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(z.any()) }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(listCommentsRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify ticket belongs to org
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, requester_id')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (ticketErr) return internalError(c, ticketErr.message);
  if (!ticket) return notFound(c, 'Ticket not found');

  // Customers can only access their own tickets
  if (!isAgentOrAbove(membership.role) && ticket.requester_id !== user.id) {
    return forbidden(c, 'You do not have access to this ticket');
  }

  let query = supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  // Customers only see public comments
  if (!isAgentOrAbove(membership.role)) {
    query = query.eq('is_internal', false);
  }

  const { data: comments, error } = await query;
  if (error) return internalError(c, error.message);

  return c.json({ data: comments ?? [] });
});

// ============================================================
// POST / — Create comment
// ============================================================
const createCommentRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Ticket Comments'],
  summary: 'Add a comment to a ticket',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
    body: {
      content: { 'application/json': { schema: createTicketCommentSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Comment created',
      content: { 'application/json': { schema: z.object({ data: z.any() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
    404: { description: 'Not found' },
  },
});

app.openapi(createCommentRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const body = c.req.valid('json');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Verify ticket belongs to org
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id, requester_id, first_response_at')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (ticketErr) return internalError(c, ticketErr.message);
  if (!ticket) return notFound(c, 'Ticket not found');

  // Customers can only comment on their own tickets
  if (!isAgentOrAbove(membership.role) && ticket.requester_id !== user.id) {
    return forbidden(c, 'You do not have access to this ticket');
  }

  // Only agents/admins/owners can post internal notes
  if (body.is_internal && !isAgentOrAbove(membership.role)) {
    return forbidden(c, 'Only agents, admins, and owners can post internal notes');
  }

  const { data: comment, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: body.body,
      is_internal: body.is_internal,
      attachments: body.attachments,
    })
    .select()
    .single();

  if (error) return badRequest(c, error.message);

  // Track first public reply for SLA (set first_response_at if null and this is a public reply by an agent)
  if (
    !body.is_internal &&
    isAgentOrAbove(membership.role) &&
    ticket.first_response_at === null
  ) {
    await supabase
      .from('tickets')
      .update({ first_response_at: new Date().toISOString() })
      .eq('id', ticketId);
  }

  // Fire-and-forget: email the requester about new public comments (not internal notes)
  if (!body.is_internal) {
    (async () => {
      if (await isNotificationEnabled(orgId, 'ticket_comment')) {
        // Notify the requester if the comment was not by the requester
        if (user.id !== ticket.requester_id) {
          const requesterEmail = await getUserEmail(ticket.requester_id);
          const requesterName = await getUserDisplayName(ticket.requester_id);
          const authorName = await getUserDisplayName(user.id);

          // Fetch ticket subject for the email
          const supabase2 = createServiceClient();
          const { data: ticketData } = await supabase2
            .from('tickets')
            .select('subject')
            .eq('id', ticketId)
            .maybeSingle();

          if (requesterEmail) {
            sendEmailAsync(orgId, {
              to: requesterEmail,
              subject: `New reply: ${ticketData?.subject ?? 'Your ticket'}`,
              html: renderTicketComment({
                ticketSubject: ticketData?.subject ?? 'Your ticket',
                ticketId,
                recipientName: requesterName,
                commentAuthor: authorName,
                commentBody: body.body,
              }),
              tags: [{ name: 'type', value: 'ticket_comment' }],
            });
          }
        }
      }
    })();
  }

  return c.json({ data: comment }, 201);
});

export default app;
