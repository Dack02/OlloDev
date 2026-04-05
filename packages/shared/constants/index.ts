export const ORG_ROLES = ['owner', 'admin', 'agent', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const CHANNEL_TYPES = ['public', 'private', 'dm'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const CHANNEL_MEMBER_ROLES = ['admin', 'member'] as const;
export type ChannelMemberRole = (typeof CHANNEL_MEMBER_ROLES)[number];

export const NOTIFICATION_LEVELS = ['all', 'mentions', 'none'] as const;
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

export const TICKET_STATUSES = ['open', 'pending', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_TYPES = ['question', 'bug', 'feature', 'task'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_SOURCES = ['portal', 'email', 'api', 'chat'] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];

export const USER_STATUSES = ['online', 'away', 'dnd', 'offline'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const ORG_PLANS = ['free', 'pro', 'enterprise'] as const;
export type OrgPlan = (typeof ORG_PLANS)[number];

export const DISCUSSION_CATEGORIES = ['general', 'ideas', 'bugs', 'announcements', 'tickets'] as const;
export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number];

export const DISCUSSION_STATUSES = ['open', 'closed', 'archived'] as const;
export type DiscussionStatus = (typeof DISCUSSION_STATUSES)[number];

export const PROJECT_STATUSES = ['planning', 'active', 'paused', 'completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const BUG_STATUSES = ['open', 'confirmed', 'in_progress', 'fixed', 'closed'] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type BugSeverity = (typeof BUG_SEVERITIES)[number];

export const BUG_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export const DEV_ITEM_TYPES = ['task', 'idea', 'improvement'] as const;
export type DevItemType = (typeof DEV_ITEM_TYPES)[number];

export const DEV_ITEM_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
export type DevItemStatus = (typeof DEV_ITEM_STATUSES)[number];

export const PROJECT_TICKET_TYPES = ['question', 'bug', 'feature', 'task'] as const;
export type ProjectTicketType = (typeof PROJECT_TICKET_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'message',
  'mention',
  'ticket_assigned',
  'ticket_updated',
  'ticket_comment',
  'discussion_reply',
  'wiki_updated',
  'github_pr_opened',
  'github_pr_merged',
  'github_ci_failed',
  'github_push',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const GITHUB_EVENT_TYPES = ['push', 'pull_request', 'check_suite', 'check_run', 'installation'] as const;
export type GitHubEventType = (typeof GITHUB_EVENT_TYPES)[number];

export const PR_STATES = ['open', 'closed', 'merged'] as const;
export type PrState = (typeof PR_STATES)[number];

export const GITHUB_PR_LINK_ITEM_TYPES = ['task', 'bug', 'ticket'] as const;
export type GitHubPrLinkItemType = (typeof GITHUB_PR_LINK_ITEM_TYPES)[number];
