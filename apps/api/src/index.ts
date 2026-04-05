import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { loggerMiddleware } from './middleware/logger.js';
import authRoutes from './routes/auth/index.js';
import orgRoutes from './routes/orgs/index.js';
import userRoutes from './routes/users/index.js';
import chatRoutes from './routes/chat/index.js';
import { channelMessages, orgMessages } from './routes/chat/messages.js';
import dmRoutes from './routes/chat/dms.js';
import notificationRoutes from './routes/notifications/index.js';
import ticketRoutes from './routes/tickets/index.js';
import ticketCommentRoutes from './routes/tickets/comments.js';
import ticketActivityRoutes from './routes/tickets/activity.js';
import ticketConfigRoutes from './routes/tickets/config.js';
import discussionRoutes from './routes/discussions/index.js';
import discussionReplyRoutes from './routes/discussions/replies.js';
import wikiRoutes from './routes/wiki/index.js';
import searchRoutes from './routes/search/index.js';
import webhookRoutes from './routes/webhooks/index.js';
import apiKeyRoutes from './routes/api-keys/index.js';
import emailSettingsRoutes from './routes/email/index.js';
import projectRoutes from './routes/projects/index.js';
import projectBugRoutes from './routes/projects/bugs.js';
import projectTaskRoutes from './routes/projects/tasks.js';
import projectFileRoutes from './routes/projects/files.js';
import projectMessageRoutes from './routes/projects/messages.js';
import projectNoteRoutes from './routes/projects/notes.js';
import projectTimeEntryRoutes from './routes/projects/time-entries.js';
import { githubInstallRoutes, githubCallbackRoutes } from './routes/github/install.js';
import githubRepoRoutes from './routes/github/repos.js';
import githubGitRoutes from './routes/github/git.js';
import githubWebhookRoutes from './routes/github/webhooks.js';
import githubLinkRoutes from './routes/github/links.js';
import githubActivityRoutes from './routes/github/activity.js';

const app = new OpenAPIHono();

// ============================================================
// Global middleware
// ============================================================
app.use('*', cors({ origin: '*' }));
app.use('*', loggerMiddleware);

// ============================================================
// Route mounts
// ============================================================
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/orgs', orgRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/orgs/:orgId/channels', chatRoutes);
app.route('/api/v1/orgs/:orgId/channels/:channelId/messages', channelMessages);
app.route('/api/v1/orgs/:orgId/messages', orgMessages);
app.route('/api/v1/orgs/:orgId/dms', dmRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/orgs/:orgId/tickets', ticketRoutes);
app.route('/api/v1/orgs/:orgId/tickets/:ticketId/comments', ticketCommentRoutes);
app.route('/api/v1/orgs/:orgId/tickets/:ticketId/activity', ticketActivityRoutes);
app.route('/api/v1/orgs/:orgId', ticketConfigRoutes);
app.route('/api/v1/orgs/:orgId/discussions', discussionRoutes);
app.route('/api/v1/orgs/:orgId/discussions/:discussionId/replies', discussionReplyRoutes);
app.route('/api/v1/orgs/:orgId/wiki', wikiRoutes);
app.route('/api/v1/orgs/:orgId/search', searchRoutes);
app.route('/api/v1/orgs/:orgId/webhooks', webhookRoutes);
app.route('/api/v1/orgs/:orgId/api-keys', apiKeyRoutes);
app.route('/api/v1/orgs/:orgId', emailSettingsRoutes);
app.route('/api/v1/orgs/:orgId/projects', projectRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/bugs', projectBugRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/tasks', projectTaskRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/files', projectFileRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/messages', projectMessageRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/notes', projectNoteRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/time-entries', projectTimeEntryRoutes);

// GitHub integration
app.route('/api/v1/github', githubCallbackRoutes);
app.route('/api/v1/github', githubWebhookRoutes);
app.route('/api/v1/orgs/:orgId/github', githubInstallRoutes);
app.route('/api/v1/orgs/:orgId/github/repos', githubRepoRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/github', githubGitRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/github/repos', githubRepoRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/github/links', githubLinkRoutes);
app.route('/api/v1/orgs/:orgId/projects/:projectId/github/activity', githubActivityRoutes);

// ============================================================
// Health check
// ============================================================
app.get('/api/v1/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.1',
  });
});

// ============================================================
// OpenAPI spec + Swagger UI
// ============================================================
app.doc('/api/v1/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Ollo Dev API',
    version: '0.0.1',
    description: 'The Ollo Dev REST API',
  },
});

app.get(
  '/api/v1/docs',
  swaggerUI({ url: '/api/v1/openapi.json' })
);

// ============================================================
// Start server
// ============================================================
const port = Number(process.env.PORT) || 8000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Ollo Dev API running on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api/v1/docs`);
  console.log(`OpenAPI spec: http://localhost:${port}/api/v1/openapi.json`);
});

export default app;
