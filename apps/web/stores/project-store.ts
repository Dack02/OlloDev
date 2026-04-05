import { create } from "zustand";

// ── Shared types ────────────────────────────────────────────────

export type ProjectStatus = "planning" | "active" | "paused" | "completed";

// ── Project ─────────────────────────────────────────────────────

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  owner_id: string;
  channel_id: string | null; // auto-created project channel
  channel_ids: string[];
  wiki_space_ids: string[];
  ticket_queue_ids: string[];
  discussion_ids: string[];
  task_count: number;
  completed_task_count: number;
  created_at: string;
  updated_at: string;
}

// ── Dev tasks (tasks + ideas + improvements) ────────────────────

export type DevItemType = "task" | "idea" | "improvement";
export type DevItemStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: DevItemType;
  status: DevItemStatus;
  priority: Priority;
  assignee_id: string | null;
  due_at: string | null;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ── Bugs ────────────────────────────────────────────────────────

export type BugStatus = "open" | "confirmed" | "in_progress" | "fixed" | "closed";
export type BugSeverity = "low" | "medium" | "high" | "critical";

export interface ProjectBug {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: Priority;
  severity: BugSeverity;
  assignee_id: string | null;
  reporter_id: string;
  labels: string[];
  created_at: string;
  updated_at: string;
}

// ── Tickets (support, project-scoped) ───────────────────────────

export type TicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed";
export type TicketType = "question" | "bug" | "feature" | "task";

export interface ProjectTicket {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  type: TicketType;
  requester_name: string;
  requester_email: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Files ───────────────────────────────────────────────────────

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  url: string;
  type: string; // mime type
  size: number; // bytes
  uploaded_by: string;
  created_at: string;
}

// ── Updates / changelog ─────────────────────────────────────────

export interface ProjectUpdate {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  body: string;
  type: "progress" | "blocker" | "milestone" | "note";
  created_at: string;
}

// ── Chat messages (project channel) ─────────────────────────────

export interface ProjectMessage {
  id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

// ── Store ───────────────────────────────────────────────────────

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  activeTaskId: string | null;
  activeBugId: string | null;
  activeTicketId: string | null;

  tasks: ProjectTask[];
  bugs: ProjectBug[];
  tickets: ProjectTicket[];
  files: ProjectFile[];
  updates: ProjectUpdate[];
  messages: ProjectMessage[];

  // Chat unread tracking: project_id → ISO timestamp of last read
  chatLastReadAt: Record<string, string>;

  detailPanelOpen: boolean;

  // Setters
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  setActiveTask: (id: string | null) => void;
  setActiveBug: (id: string | null) => void;
  setActiveTicket: (id: string | null) => void;
  setTasks: (tasks: ProjectTask[]) => void;
  setBugs: (bugs: ProjectBug[]) => void;
  setTickets: (tickets: ProjectTicket[]) => void;
  setFiles: (files: ProjectFile[]) => void;
  setUpdates: (updates: ProjectUpdate[]) => void;
  setMessages: (messages: ProjectMessage[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addTask: (task: ProjectTask) => void;
  updateTask: (id: string, updates: Partial<ProjectTask>) => void;
  addBug: (bug: ProjectBug) => void;
  updateBug: (id: string, updates: Partial<ProjectBug>) => void;
  addTicket: (ticket: ProjectTicket) => void;
  updateTicket: (id: string, updates: Partial<ProjectTicket>) => void;
  addFile: (file: ProjectFile) => void;
  removeFile: (id: string) => void;
  addMessage: (message: ProjectMessage) => void;
  markChatRead: (projectId: string) => void;
  getUnreadCount: (projectId: string) => number;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
}

// ── Mock data ───────────────────────────────────────────────────

const mockProjects: Project[] = [
  {
    id: "1",
    org_id: "org_1",
    name: "Auth Redesign",
    description: "Migrate authentication from legacy JWT to Supabase Auth with SSO support",
    color: "#3b82f6",
    status: "active",
    owner_id: "user_1",
    channel_id: "ch_proj_1",
    channel_ids: ["ch_auth"],
    wiki_space_ids: ["ws_auth"],
    ticket_queue_ids: ["tq_auth"],
    discussion_ids: [],
    task_count: 12,
    completed_task_count: 7,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-04-04T14:30:00Z",
  },
  {
    id: "2",
    org_id: "org_1",
    name: "API v2 Migration",
    description: "Version the Hono API and migrate endpoints to OpenAPI 3.1 spec",
    color: "#22c55e",
    status: "active",
    owner_id: "user_1",
    channel_id: "ch_proj_2",
    channel_ids: ["ch_api"],
    wiki_space_ids: [],
    ticket_queue_ids: [],
    discussion_ids: ["d_api_1"],
    task_count: 8,
    completed_task_count: 3,
    created_at: "2026-03-20T09:00:00Z",
    updated_at: "2026-04-03T11:00:00Z",
  },
  {
    id: "3",
    org_id: "org_1",
    name: "Helpdesk Launch",
    description: "Ship the customer-facing helpdesk portal with ticket submission and tracking",
    color: "#f59e0b",
    status: "planning",
    owner_id: "user_1",
    channel_id: "ch_proj_3",
    channel_ids: [],
    wiki_space_ids: ["ws_helpdesk"],
    ticket_queue_ids: ["tq_support"],
    discussion_ids: [],
    task_count: 15,
    completed_task_count: 0,
    created_at: "2026-04-01T08:00:00Z",
    updated_at: "2026-04-01T08:00:00Z",
  },
];

const mockTasks: ProjectTask[] = [
  {
    id: "t1",
    project_id: "1",
    title: "Set up Supabase Auth providers",
    description: "Configure Google, GitHub, and email providers in Supabase dashboard",
    type: "task",
    status: "done",
    priority: "high",
    assignee_id: "user_1",
    due_at: "2026-03-20T00:00:00Z",
    tags: ["auth", "setup"],
    sort_order: 0,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-18T16:00:00Z",
  },
  {
    id: "t2",
    project_id: "1",
    title: "Build login/signup UI components",
    description: "Create auth forms with proper validation and error states",
    type: "task",
    status: "done",
    priority: "high",
    assignee_id: "user_1",
    due_at: "2026-03-25T00:00:00Z",
    tags: ["auth", "ui"],
    sort_order: 1,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-24T12:00:00Z",
  },
  {
    id: "t3",
    project_id: "1",
    title: "Implement SSO with SAML",
    description: "Add SAML integration for enterprise SSO",
    type: "task",
    status: "in_progress",
    priority: "medium",
    assignee_id: "user_1",
    due_at: "2026-04-10T00:00:00Z",
    tags: ["auth", "enterprise"],
    sort_order: 2,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-04-02T09:00:00Z",
  },
  {
    id: "t4",
    project_id: "1",
    title: "Add RLS policies for new auth schema",
    description: "Update Supabase RLS policies to work with new auth tokens",
    type: "task",
    status: "todo",
    priority: "high",
    assignee_id: null,
    due_at: "2026-04-15T00:00:00Z",
    tags: ["auth", "database"],
    sort_order: 3,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "t5",
    project_id: "1",
    title: "Write migration scripts for existing users",
    description: "Script to migrate user records from old auth to Supabase Auth",
    type: "task",
    status: "backlog",
    priority: "medium",
    assignee_id: null,
    due_at: null,
    tags: ["auth", "migration"],
    sort_order: 4,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "t6",
    project_id: "1",
    title: "Add magic link authentication",
    description: "Passwordless auth via email magic links for better UX",
    type: "idea",
    status: "backlog",
    priority: "low",
    assignee_id: null,
    due_at: null,
    tags: ["auth", "ux"],
    sort_order: 5,
    created_at: "2026-03-20T10:00:00Z",
    updated_at: "2026-03-20T10:00:00Z",
  },
  {
    id: "t7",
    project_id: "1",
    title: "Refactor session token refresh logic",
    description: "Current refresh flow has a race condition under heavy load",
    type: "improvement",
    status: "todo",
    priority: "medium",
    assignee_id: null,
    due_at: null,
    tags: ["auth", "perf"],
    sort_order: 6,
    created_at: "2026-03-28T10:00:00Z",
    updated_at: "2026-03-28T10:00:00Z",
  },
];

const mockBugs: ProjectBug[] = [
  {
    id: "b1",
    project_id: "1",
    title: "OAuth callback fails on Safari 17",
    description: "The redirect URI doesn't resolve properly on Safari 17 due to ITP blocking third-party cookies during the OAuth flow.",
    status: "open",
    priority: "high",
    severity: "high",
    assignee_id: "user_1",
    reporter_id: "user_1",
    labels: ["auth", "safari", "oauth"],
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  },
  {
    id: "b2",
    project_id: "1",
    title: "Session expires without warning",
    description: "Users get silently logged out after 30 minutes with no toast or redirect to login. Should show a warning at 25 min.",
    status: "confirmed",
    priority: "medium",
    severity: "medium",
    assignee_id: null,
    reporter_id: "user_1",
    labels: ["auth", "ux"],
    created_at: "2026-03-29T14:00:00Z",
    updated_at: "2026-04-02T10:00:00Z",
  },
  {
    id: "b3",
    project_id: "1",
    title: "Password reset email sent twice",
    description: "Clicking 'Reset password' sends two emails. Likely a double-submit on the form.",
    status: "in_progress",
    priority: "medium",
    severity: "low",
    assignee_id: "user_1",
    reporter_id: "user_1",
    labels: ["auth", "email"],
    created_at: "2026-03-25T11:00:00Z",
    updated_at: "2026-04-03T08:00:00Z",
  },
  {
    id: "b4",
    project_id: "1",
    title: "Login rate limiter too aggressive",
    description: "Rate limiter blocks after 3 failed attempts instead of 5. Config issue in Supabase.",
    status: "fixed",
    priority: "low",
    severity: "low",
    assignee_id: "user_1",
    reporter_id: "user_1",
    labels: ["auth", "config"],
    created_at: "2026-03-20T16:00:00Z",
    updated_at: "2026-03-22T09:00:00Z",
  },
];

const mockTickets: ProjectTicket[] = [
  {
    id: "pt1",
    project_id: "1",
    title: "Can't log in with Google account",
    description: "Customer reports clicking 'Sign in with Google' shows a blank page then redirects back to login.",
    status: "open",
    priority: "high",
    type: "bug",
    requester_name: "Sarah Chen",
    requester_email: "sarah@acmecorp.io",
    assignee_id: "user_1",
    created_at: "2026-04-03T10:30:00Z",
    updated_at: "2026-04-03T10:30:00Z",
  },
  {
    id: "pt2",
    project_id: "1",
    title: "How do I enable SSO for my team?",
    description: "We have 50+ seats and want to use our Okta IdP. Where do we configure this?",
    status: "pending",
    priority: "medium",
    type: "question",
    requester_name: "James Liu",
    requester_email: "james@bigcorp.com",
    assignee_id: null,
    created_at: "2026-04-02T15:00:00Z",
    updated_at: "2026-04-03T09:00:00Z",
  },
  {
    id: "pt3",
    project_id: "1",
    title: "Request: support passkeys for login",
    description: "Would love to see WebAuthn / passkey support as a login method.",
    status: "open",
    priority: "low",
    type: "feature",
    requester_name: "Mia Torres",
    requester_email: "mia@startup.dev",
    assignee_id: null,
    created_at: "2026-03-30T12:00:00Z",
    updated_at: "2026-03-30T12:00:00Z",
  },
];

const mockFiles: ProjectFile[] = [
  {
    id: "f1",
    project_id: "1",
    name: "auth-flow-diagram.png",
    url: "/files/auth-flow-diagram.png",
    type: "image/png",
    size: 245_000,
    uploaded_by: "user_1",
    created_at: "2026-03-16T10:00:00Z",
  },
  {
    id: "f2",
    project_id: "1",
    name: "sso-integration-spec.pdf",
    url: "/files/sso-integration-spec.pdf",
    type: "application/pdf",
    size: 1_200_000,
    uploaded_by: "user_1",
    created_at: "2026-03-18T14:00:00Z",
  },
  {
    id: "f3",
    project_id: "1",
    name: "supabase-auth-config.json",
    url: "/files/supabase-auth-config.json",
    type: "application/json",
    size: 3_400,
    uploaded_by: "user_1",
    created_at: "2026-03-20T09:00:00Z",
  },
  {
    id: "f4",
    project_id: "1",
    name: "login-page-mockup.fig",
    url: "/files/login-page-mockup.fig",
    type: "application/octet-stream",
    size: 890_000,
    uploaded_by: "user_1",
    created_at: "2026-03-22T11:00:00Z",
  },
];

const mockUpdates: ProjectUpdate[] = [
  {
    id: "u1",
    project_id: "1",
    author_id: "user_1",
    title: "SSO integration started",
    body: "Began SAML integration. Working with the identity provider SDK — should have a working prototype by end of week.",
    type: "progress",
    created_at: "2026-04-03T14:00:00Z",
  },
  {
    id: "u2",
    project_id: "1",
    author_id: "user_1",
    title: "Login UI complete",
    body: "All auth forms shipped with validation, error states, and dark mode support. Ready for review.",
    type: "milestone",
    created_at: "2026-03-24T12:00:00Z",
  },
  {
    id: "u3",
    project_id: "1",
    author_id: "user_1",
    title: "Safari OAuth issue blocking SSO rollout",
    body: "ITP in Safari 17 breaks the redirect flow. Need to investigate a workaround before we can ship SSO.",
    type: "blocker",
    created_at: "2026-04-01T10:00:00Z",
  },
];

const mockMessages: ProjectMessage[] = [
  {
    id: "m1",
    project_id: "1",
    author_id: "user_1",
    author_name: "Leo",
    body: "Starting work on the SAML integration today. Going to use the @supabase/auth-helpers SDK.",
    created_at: "2026-04-03T09:15:00Z",
  },
  {
    id: "m2",
    project_id: "1",
    author_id: "user_2",
    author_name: "Alex",
    body: "Nice! Let me know if you need help testing with our Okta sandbox. I've got credentials set up.",
    created_at: "2026-04-03T09:22:00Z",
  },
  {
    id: "m3",
    project_id: "1",
    author_id: "user_1",
    author_name: "Leo",
    body: "That would be great. Also found a Safari ITP issue with the OAuth callback — going to log it as a bug.",
    created_at: "2026-04-03T09:30:00Z",
  },
  {
    id: "m4",
    project_id: "1",
    author_id: "user_2",
    author_name: "Alex",
    body: "Ah yeah, Safari and third-party cookies... might need to use a relay page on our own domain.",
    created_at: "2026-04-03T09:35:00Z",
  },
  {
    id: "m5",
    project_id: "1",
    author_id: "user_1",
    author_name: "Leo",
    body: "Good call. I'll prototype that approach and update the bug ticket.",
    created_at: "2026-04-03T09:40:00Z",
  },
];

// ── Create store ────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: mockProjects,
  activeProjectId: null,
  activeTaskId: null,
  activeBugId: null,
  activeTicketId: null,

  tasks: mockTasks,
  bugs: mockBugs,
  tickets: mockTickets,
  files: mockFiles,
  updates: mockUpdates,
  messages: mockMessages,

  // Simulate: user last read project 1 chat before the last 2 messages from Alex
  chatLastReadAt: { "1": "2026-04-03T09:30:00Z" },

  detailPanelOpen: true,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) =>
    set({ activeProjectId: id, activeTaskId: null, activeBugId: null, activeTicketId: null }),
  setActiveTask: (id) => set({ activeTaskId: id }),
  setActiveBug: (id) => set({ activeBugId: id }),
  setActiveTicket: (id) => set({ activeTicketId: id }),
  setTasks: (tasks) => set({ tasks }),
  setBugs: (bugs) => set({ bugs }),
  setTickets: (tickets) => set({ tickets }),
  setFiles: (files) => set({ files }),
  setUpdates: (updates) => set({ updates }),
  setMessages: (messages) => set({ messages }),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  addBug: (bug) =>
    set((state) => ({ bugs: [...state.bugs, bug] })),
  updateBug: (id, updates) =>
    set((state) => ({
      bugs: state.bugs.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),

  addTicket: (ticket) =>
    set((state) => ({ tickets: [...state.tickets, ticket] })),
  updateTicket: (id, updates) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  addFile: (file) =>
    set((state) => ({ files: [...state.files, file] })),
  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  markChatRead: (projectId) =>
    set((state) => ({
      chatLastReadAt: { ...state.chatLastReadAt, [projectId]: new Date().toISOString() },
    })),

  getUnreadCount: (projectId) => {
    const state = get();
    const lastRead = state.chatLastReadAt[projectId];
    const projectMessages = state.messages.filter(
      (m) => m.project_id === projectId && m.author_id !== "user_1"
    );
    if (!lastRead) return projectMessages.length;
    return projectMessages.filter(
      (m) => new Date(m.created_at).getTime() > new Date(lastRead).getTime()
    ).length;
  },

  toggleDetailPanel: () =>
    set((state) => ({ detailPanelOpen: !state.detailPanelOpen })),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
}));
