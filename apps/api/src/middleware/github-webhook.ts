import { Webhooks } from '@octokit/webhooks';
import type { Context, Next } from 'hono';
import { getWebhookSecret } from '../services/github.js';

/**
 * Middleware that verifies GitHub webhook signatures.
 * Must be applied to the raw (un-parsed) webhook route.
 */
export async function verifyGitHubWebhook(c: Context, next: Next) {
  const secret = getWebhookSecret();
  if (!secret) {
    return c.json({ error: { code: 'github_not_configured', message: 'GitHub webhook secret not configured' } }, 500);
  }

  const signature = c.req.header('x-hub-signature-256') ?? '';
  if (!signature) {
    return c.json({ error: { code: 'missing_signature', message: 'Missing X-Hub-Signature-256 header' } }, 401);
  }

  const rawBody = await c.req.text();

  const webhooks = new Webhooks({ secret });
  const valid = await webhooks.verify(rawBody, signature);
  if (!valid) {
    return c.json({ error: { code: 'invalid_signature', message: 'Invalid webhook signature' } }, 401);
  }

  // Stash parsed body and event type for downstream handlers
  c.set('webhookPayload', JSON.parse(rawBody));
  c.set('webhookEvent', c.req.header('x-github-event') ?? '');
  c.set('webhookDelivery', c.req.header('x-github-delivery') ?? '');

  await next();
}
