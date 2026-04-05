import { z } from 'zod';
import {
  ORG_ROLES,
  ORG_PLANS,
  CHANNEL_TYPES,
  CHANNEL_MEMBER_ROLES,
  NOTIFICATION_LEVELS,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_TYPES,
  TICKET_SOURCES,
  USER_STATUSES,
  THEMES,
  DISCUSSION_CATEGORIES,
  PROJECT_STATUSES,
  BUG_STATUSES,
  BUG_SEVERITIES,
  BUG_PRIORITIES,
  DEV_ITEM_TYPES,
  DEV_ITEM_STATUSES,
  PROJECT_TICKET_TYPES,
} from '../constants/index.js';

// ============================================================
// Common
// ============================================================
export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

// ============================================================
// Auth
// ============================================================
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  display_name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

// ============================================================
// Organizations
// ============================================================
export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ORG_ROLES).default('member'),
});

export const updateMemberSchema = z.object({
  role: z.enum(ORG_ROLES),
});

// ============================================================
// Channels
// ============================================================
export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  type: z.enum(CHANNEL_TYPES).default('public'),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  is_archived: z.boolean().optional(),
});

// ============================================================
// Messages
// ============================================================
export const createMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  parent_id: z.string().uuid().nullable().optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string(),
        type: z.string(),
        size: z.number(),
      })
    )
    .default([]),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

// ============================================================
// Discussions
// ============================================================
export const createDiscussionSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
  category: z.enum(DISCUSSION_CATEGORIES).optional(),
  tags: z.array(z.string().max(30)).max(5).default([]),
});

export const updateDiscussionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(50000).optional(),
  category: z.enum(DISCUSSION_CATEGORIES).nullable().optional(),
  is_pinned: z.boolean().optional(),
  is_locked: z.boolean().optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
});

export const createDiscussionReplySchema = z.object({
  body: z.string().min(1).max(50000),
  parent_id: z.string().uuid().nullable().optional(),
});

// ============================================================
// Wiki
// ============================================================
export const createWikiSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  is_public: z.boolean().default(false),
});

export const createWikiPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  content: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const updateWikiPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  change_note: z.string().max(200).optional(),
});

// ============================================================
// Tickets
// ============================================================
export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(50000),
  priority: z.enum(TICKET_PRIORITIES).default('normal'),
  type: z.enum(TICKET_TYPES).default('question'),
  queue_id: z.string().uuid().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  custom_fields: z.record(z.unknown()).default({}),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(50000).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  type: z.enum(TICKET_TYPES).optional(),
  queue_id: z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  custom_fields: z.record(z.unknown()).optional(),
});

export const createTicketCommentSchema = z.object({
  body: z.string().min(1).max(50000),
  is_internal: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string(),
        type: z.string(),
        size: z.number(),
      })
    )
    .default([]),
});

export const assignTicketSchema = z.object({
  assignee_id: z.string().uuid().nullable(),
});

export const satisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// ============================================================
// Ticket Config
// ============================================================
export const createQueueSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  color: z.string().max(7).optional(),
  sla_policy_id: z.string().uuid().optional(),
  auto_assign: z.boolean().default(false),
});

export const createSlaPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  response_times: z.record(z.number().int().positive()),
  resolution_times: z.record(z.number().int().positive()),
  business_hours: z.boolean().optional(),
  is_default: z.boolean().default(false),
});

export const createCannedResponseSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  category: z.string().max(50).optional(),
  shortcut: z.string().max(20).optional(),
  is_shared: z.boolean().default(true),
});

export const updateCannedResponseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(10000).optional(),
  category: z.string().max(50).nullable().optional(),
  shortcut: z.string().max(20).nullable().optional(),
  is_shared: z.boolean().optional(),
});

// ============================================================
// Users
// ============================================================
export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  locale: z.string().max(10).optional(),
  theme: z.enum(THEMES).optional(),
  timezone: z.string().max(50).optional(),
  status: z.enum(USER_STATUSES).optional(),
  status_text: z.string().max(100).nullable().optional(),
});

// ============================================================
// Search
// ============================================================
export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  scope: z.string().optional(), // comma-separated: messages,tickets,wiki
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ============================================================
// Webhooks
// ============================================================
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional(),
  is_active: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================
// Email Settings
// ============================================================
export const updateEmailSettingsSchema = z.object({
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

// ============================================================
// API Keys
// ============================================================
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.record(z.unknown()).default({}),
  expires_at: z.string().datetime().optional(),
});

// ============================================================
// Projects
// ============================================================
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  color: z.string().max(7).default('#3b82f6'),
  status: z.enum(PROJECT_STATUSES).default('planning'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  color: z.string().max(7).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

// ============================================================
// Project Bugs
// ============================================================
export const createBugSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(50000).optional(),
  priority: z.enum(BUG_PRIORITIES).default('medium'),
  severity: z.enum(BUG_SEVERITIES).default('medium'),
  assignee_id: z.string().uuid().nullable().optional(),
  labels: z.array(z.string().max(30)).max(10).default([]),
});

export const updateBugSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(50000).nullable().optional(),
  status: z.enum(BUG_STATUSES).optional(),
  priority: z.enum(BUG_PRIORITIES).optional(),
  severity: z.enum(BUG_SEVERITIES).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  labels: z.array(z.string().max(30)).max(10).optional(),
});

// ============================================================
// Project Tasks (Dev tab)
// ============================================================
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(50000).optional(),
  type: z.enum(DEV_ITEM_TYPES).default('task'),
  status: z.enum(DEV_ITEM_STATUSES).default('backlog'),
  priority: z.enum(BUG_PRIORITIES).default('medium'),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(50000).nullable().optional(),
  type: z.enum(DEV_ITEM_TYPES).optional(),
  status: z.enum(DEV_ITEM_STATUSES).optional(),
  priority: z.enum(BUG_PRIORITIES).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  sort_order: z.number().int().optional(),
});

// ============================================================
// Project Tickets
// ============================================================
export const createProjectTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(50000).optional(),
  priority: z.enum(BUG_PRIORITIES).default('medium'),
  type: z.enum(PROJECT_TICKET_TYPES).default('question'),
  requester_name: z.string().max(200).optional(),
  requester_email: z.string().email().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
});

export const updateProjectTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(50000).nullable().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(BUG_PRIORITIES).optional(),
  type: z.enum(PROJECT_TICKET_TYPES).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
});

// ============================================================
// Project Messages
// ============================================================
export const createProjectMessageSchema = z.object({
  body: z.string().min(1).max(10000),
});
