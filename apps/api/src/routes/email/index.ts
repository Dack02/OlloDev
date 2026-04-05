import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createServiceClient } from '../../lib/supabase.js';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { validateResendApiKey } from '../../services/email.js';
import {
  badRequest,
  forbidden,
  internalError,
} from '../../lib/errors.js';

const app = new OpenAPIHono<{ Variables: AuthVariables }>();

app.use('/*', authMiddleware);

// ============================================================
// Helpers
// ============================================================

async function verifyOrgAdmin(orgId: string, userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !['owner', 'admin'].includes(data.role)) return null;
  return data;
}

// ============================================================
// GET /email-settings — Get email configuration (no raw key)
// ============================================================
const getEmailSettingsRoute = createRoute({
  method: 'get',
  path: '/email-settings',
  tags: ['Email Settings'],
  summary: 'Get email settings for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Email settings',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              has_api_key: z.boolean(),
              email_from_address: z.string().nullable(),
              email_from_name: z.string().nullable(),
              email_notifications: z.record(z.boolean()).nullable(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(getEmailSettingsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');

  const membership = await verifyOrgAdmin(orgId, user.id);
  if (!membership) return forbidden(c, 'Only admins and owners can manage email settings');

  const supabase = createServiceClient();
  const { data: org, error } = await supabase
    .from('orgs')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (error) return internalError(c, error.message);

  const settings = (org?.settings as Record<string, unknown>) ?? {};
  const email = (settings.email as Record<string, unknown>) ?? {};

  return c.json({
    data: {
      has_api_key: !!email.resend_api_key,
      email_from_address: (email.email_from_address as string) ?? null,
      email_from_name: (email.email_from_name as string) ?? null,
      email_notifications: (email.email_notifications as Record<string, boolean>) ?? null,
    },
  });
});

// ============================================================
// PUT /email-settings — Save email configuration
// ============================================================
const updateEmailSettingsSchema = z.object({
  resend_api_key: z.string().min(1).optional(),
  email_from_address: z.string().email().optional(),
  email_from_name: z.string().min(1).max(100).optional(),
  email_notifications: z
    .object({
      ticket_created: z.boolean().optional(),
      ticket_status_changed: z.boolean().optional(),
      ticket_assigned: z.boolean().optional(),
      ticket_comment: z.boolean().optional(),
      ticket_resolved: z.boolean().optional(),
    })
    .optional(),
});

const updateEmailSettingsRoute = createRoute({
  method: 'put',
  path: '/email-settings',
  tags: ['Email Settings'],
  summary: 'Update email settings for an organization',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: updateEmailSettingsSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Email settings updated',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(updateEmailSettingsRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const body = c.req.valid('json');

  const membership = await verifyOrgAdmin(orgId, user.id);
  if (!membership) return forbidden(c, 'Only admins and owners can manage email settings');

  // Validate the Resend API key if provided
  if (body.resend_api_key) {
    const validation = await validateResendApiKey(body.resend_api_key);
    if (!validation.valid) {
      return badRequest(c, validation.error ?? 'Invalid Resend API key.');
    }
  }

  const supabase = createServiceClient();

  // Fetch current settings to merge
  const { data: org, error: fetchErr } = await supabase
    .from('orgs')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);

  const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
  const currentEmail = (currentSettings.email as Record<string, unknown>) ?? {};

  // Merge new values into existing email config
  const updatedEmail = { ...currentEmail };
  if (body.resend_api_key !== undefined) updatedEmail.resend_api_key = body.resend_api_key;
  if (body.email_from_address !== undefined) updatedEmail.email_from_address = body.email_from_address;
  if (body.email_from_name !== undefined) updatedEmail.email_from_name = body.email_from_name;
  if (body.email_notifications !== undefined) {
    updatedEmail.email_notifications = {
      ...(currentEmail.email_notifications as Record<string, boolean> ?? {}),
      ...body.email_notifications,
    };
  }

  const { error: updateErr } = await supabase
    .from('orgs')
    .update({
      settings: { ...currentSettings, email: updatedEmail },
    })
    .eq('id', orgId);

  if (updateErr) return internalError(c, updateErr.message);

  return c.json({ success: true });
});

// ============================================================
// POST /email-settings/test — Send a test email
// ============================================================
const testEmailRoute = createRoute({
  method: 'post',
  path: '/email-settings/test',
  tags: ['Email Settings'],
  summary: 'Send a test email to verify configuration',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            to: z.string().email(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Test email sent',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), message: z.string() }) } },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(testEmailRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');
  const { to } = c.req.valid('json');

  const membership = await verifyOrgAdmin(orgId, user.id);
  if (!membership) return forbidden(c, 'Only admins and owners can test email settings');

  // Import sendEmail dynamically to use the org's config
  const { sendEmail } = await import('../../services/email.js');

  const success = await sendEmail(orgId, {
    to,
    subject: 'Test Email from Ollo',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;text-align:center;">
        <h2 style="color:#111827;">Email is working!</h2>
        <p style="color:#6b7280;font-size:15px;">Your Resend integration with Ollo is configured correctly.</p>
      </div>
    `,
  });

  if (success) {
    return c.json({ success: true, message: `Test email sent to ${to}` });
  } else {
    return badRequest(c, 'Failed to send test email. Check your Resend API key and from address.');
  }
});

// ============================================================
// DELETE /email-settings/api-key — Remove the Resend API key
// ============================================================
const removeApiKeyRoute = createRoute({
  method: 'delete',
  path: '/email-settings/api-key',
  tags: ['Email Settings'],
  summary: 'Remove the Resend API key',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ orgId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'API key removed',
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});

app.openapi(removeApiKeyRoute, async (c) => {
  const user = c.get('user');
  const { orgId } = c.req.valid('param');

  const membership = await verifyOrgAdmin(orgId, user.id);
  if (!membership) return forbidden(c, 'Only admins and owners can manage email settings');

  const supabase = createServiceClient();

  const { data: org, error: fetchErr } = await supabase
    .from('orgs')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (fetchErr) return internalError(c, fetchErr.message);

  const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
  const currentEmail = (currentSettings.email as Record<string, unknown>) ?? {};

  delete currentEmail.resend_api_key;

  const { error: updateErr } = await supabase
    .from('orgs')
    .update({
      settings: { ...currentSettings, email: currentEmail },
    })
    .eq('id', orgId);

  if (updateErr) return internalError(c, updateErr.message);

  return c.json({ success: true });
});

export default app;
