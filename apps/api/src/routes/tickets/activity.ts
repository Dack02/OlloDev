import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  forbidden,
  notFound,
  internalError,
} from '../../lib/errors.js';

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
// GET / — List activity for a ticket
// ============================================================
const listActivityRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Ticket Activity'],
  summary: 'List activity log for a ticket (agents only)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      orgId: z.string().uuid(),
      ticketId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'List of activity entries',
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

app.openapi(listActivityRoute, async (c) => {
  const user = c.get('user');
  const { orgId, ticketId } = c.req.valid('param');
  const supabase = createServiceClient();

  const membership = await verifyOrgMembership(orgId, user.id);
  if (!membership) return forbidden(c, 'You are not a member of this organization');

  // Only agents/admins/owners can view the activity log
  if (!isAgentOrAbove(membership.role)) {
    return forbidden(c, 'Only agents, admins, and owners can view the activity log');
  }

  // Verify ticket belongs to org
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('id')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (ticketErr) return internalError(c, ticketErr.message);
  if (!ticket) return notFound(c, 'Ticket not found');

  const { data: activity, error } = await supabase
    .from('ticket_activity')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) return internalError(c, error.message);

  return c.json({ data: activity ?? [] });
});

export default app;
