import type {
  OrgRole,
  OrgPlan,
  ChannelType,
  ChannelMemberRole,
  NotificationLevel,
  TicketStatus,
  TicketPriority,
  TicketType,
  UserStatus,
  Theme,
  DiscussionCategory,
  DiscussionStatus,
  NotificationType,
} from '../constants/index.js';

// ============================================================
// Organizations
// ============================================================
export interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  plan: OrgPlan;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Users & Membership
// ============================================================
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  theme: Theme;
  timezone: string;
  status: UserStatus;
  status_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  permissions: Record<string, unknown>;
  joined_at: string;
}

// ============================================================
// Chat
// ============================================================
export interface Channel {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ChannelType;
  created_by: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  last_read_at: string;
  notifications: NotificationLevel;
  joined_at: string;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  content_html: string | null;
  attachments: Attachment[];
  reactions: Record<string, string[]>;
  is_edited: boolean;
  is_deleted: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Discussions
// ============================================================
export interface Discussion {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  body: string;
  body_html: string | null;
  author_id: string;
  category: DiscussionCategory | null;
  is_pinned: boolean;
  is_locked: boolean;
  tags: string[];
  upvotes: number;
  reply_count: number;
  status: DiscussionStatus;
  source_type: string | null;
  source_id: string | null;
  closed_at: string | null;
  closed_by: string | null;
  close_reason: string | null;
  assignee_id: string | null;
  priority: string | null;
  requester_name: string | null;
  requester_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  body_html: string | null;
  is_accepted: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Wiki
// ============================================================
export interface WikiSpace {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_public: boolean;
  created_at: string;
}

export interface WikiPage {
  id: string;
  space_id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  content: string;
  content_html: string | null;
  author_id: string;
  last_edited_by: string | null;
  is_published: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WikiPageVersion {
  id: string;
  page_id: string;
  content: string;
  edited_by: string;
  change_note: string | null;
  version: number;
  created_at: string;
}

// ============================================================
// Project Notes
// ============================================================
export interface ProjectNote {
  id: string;
  project_id: string;
  title: string;
  content: string;
  author_id: string | null;
  is_pinned: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Project Bugs
// ============================================================
export interface ProjectBug {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string;
  assignee_id: string | null;
  reporter_id: string | null;
  labels: string[];
  discussion_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Project Tasks
// ============================================================
export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_at: string | null;
  tags: string[];
  sort_order: number;
  discussion_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Project Tickets
// ============================================================
export interface ProjectTicket {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  requester_name: string | null;
  requester_email: string | null;
  assignee_id: string | null;
  discussion_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tickets
// ============================================================
export interface TicketQueue {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sla_policy_id: string | null;
  auto_assign: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  org_id: string;
  queue_id: string | null;
  subject: string;
  description: string;
  description_html: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  requester_id: string;
  assignee_id: string | null;
  sla_policy_id: string | null;
  sla_breach_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  due_at: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  body_html: string | null;
  is_internal: boolean;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SlaPolicy {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  response_times: Record<string, number>;
  resolution_times: Record<string, number>;
  business_hours: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CannedResponse {
  id: string;
  org_id: string;
  title: string;
  content: string;
  category: string | null;
  shortcut: string | null;
  created_by: string | null;
  is_shared: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Notifications
// ============================================================
export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// API Keys
// ============================================================
export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  permissions: Record<string, unknown>;
  last_used_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================
// Time Entries
// ============================================================
export interface TimeEntry {
  id: string;
  org_id: string;
  project_id: string;
  user_id: string;
  task_id: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API Response Envelope
// ============================================================
export interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    has_more?: boolean;
    total?: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
