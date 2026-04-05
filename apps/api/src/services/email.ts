import { Resend } from 'resend';
import { createServiceClient } from '../lib/supabase.js';

// ============================================================
// Types
// ============================================================

export interface OrgEmailConfig {
  resend_api_key?: string;
  email_from_address?: string;
  email_from_name?: string;
  email_domain_id?: string;
  email_notifications?: {
    ticket_created?: boolean;
    ticket_status_changed?: boolean;
    ticket_assigned?: boolean;
    ticket_comment?: boolean;
    ticket_resolved?: boolean;
  };
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Retrieve the email configuration from an org's settings JSONB column.
 * Returns null if no config is set.
 */
export async function getOrgEmailConfig(orgId: string): Promise<OrgEmailConfig | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('orgs')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (error || !data?.settings) return null;

  const settings = data.settings as Record<string, unknown>;
  return (settings.email as OrgEmailConfig) ?? null;
}

/**
 * Create a Resend client from the org's stored API key.
 * Returns null if no API key is configured.
 */
export function createResendClient(apiKey: string): Resend {
  return new Resend(apiKey);
}

/**
 * Send an email using the org's configured Resend API key.
 * Fails silently (logs but does not throw) so email issues never block API responses.
 */
export async function sendEmail(orgId: string, options: SendEmailOptions): Promise<boolean> {
  try {
    const config = await getOrgEmailConfig(orgId);
    if (!config?.resend_api_key) {
      console.warn(`[email] No Resend API key configured for org ${orgId}`);
      return false;
    }

    const resend = createResendClient(config.resend_api_key);
    const fromAddress = config.email_from_address ?? 'noreply@ollo.dev';
    const fromName = config.email_from_name ?? 'Ollo Support';

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error(`[email] Resend error for org ${orgId}:`, error);
      return false;
    }

    // Optionally log the send to email_logs table
    await logEmailSend(orgId, {
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      resend_id: data?.id ?? null,
      status: 'sent',
    });

    return true;
  } catch (err) {
    console.error(`[email] Unexpected error for org ${orgId}:`, err);
    return false;
  }
}

/**
 * Fire-and-forget email send — for use in route handlers so the response
 * is not delayed by email delivery.
 */
export function sendEmailAsync(orgId: string, options: SendEmailOptions): void {
  sendEmail(orgId, options).catch((err) => {
    console.error(`[email] Async send failed for org ${orgId}:`, err);
  });
}

/**
 * Log an email send to the email_logs table for audit/debugging.
 */
async function logEmailSend(
  orgId: string,
  log: { to: string; subject: string; resend_id: string | null; status: string }
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from('email_logs').insert({
      org_id: orgId,
      to_address: log.to,
      subject: log.subject,
      resend_message_id: log.resend_id,
      status: log.status,
    });
  } catch {
    // Logging failure should never be fatal
  }
}

/**
 * Validate a Resend API key by attempting to list domains.
 * Returns { valid, error } so callers can surface specific messages.
 */
export async function validateResendApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic format check
    if (!apiKey.startsWith('re_')) {
      return { valid: false, error: 'API key must start with "re_".' };
    }

    const resend = createResendClient(apiKey);
    const { error } = await resend.domains.list();

    if (error) {
      return { valid: false, error: `Resend rejected the key: ${error.message}` };
    }

    return { valid: true };
  } catch (err) {
    console.error('[email] Resend validation error:', err);
    return { valid: false, error: 'Could not reach Resend to validate the key. Please try again.' };
  }
}

/**
 * Check if a specific notification type is enabled for the org.
 */
export async function isNotificationEnabled(
  orgId: string,
  notificationType: keyof NonNullable<OrgEmailConfig['email_notifications']>
): Promise<boolean> {
  const config = await getOrgEmailConfig(orgId);
  if (!config?.resend_api_key) return false;

  // Default: all notifications enabled if config exists but no explicit toggle
  const notifications = config.email_notifications;
  if (!notifications) return true;

  return notifications[notificationType] !== false;
}

/**
 * Look up a user's email by their user ID via the profiles table.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  return data?.email ?? null;
}

/**
 * Look up a user's display name by their user ID.
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .maybeSingle();
  return data?.display_name ?? data?.email ?? 'Someone';
}
