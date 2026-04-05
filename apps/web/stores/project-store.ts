import { create } from "zustand";

// ── Shared types ────────────────────────────────────────────────

export type ProjectStatus = "planning" | "active" | "paused" | "completed";
export type ProjectHealth = "on_track" | "at_risk" | "off_track";

// ── Project ─────────────────────────────────────────────────────

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  priority: Priority;
  health: ProjectHealth;
  client_name: string | null;
  project_url: string | null;
  repository_url: string | null;
  start_date: string | null;
  target_date: string | null;
  key_outcome: string | null;
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

// ── Notes ──────────────────────────────────────────────────────

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

// ── Time entries ───────────────────────────────────────────────

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

export interface RunningTimer extends TimeEntry {
  projects?: { name: string; color: string };
}

// ── GitHub integration ─────────────────────────────────────────

export interface GitHubRepo {
  id: string;
  project_id: string;
  full_name: string;
  default_branch: string;
  is_primary: boolean;
}

export interface GitCommit {
  sha: string;
  message: string;
  author_login: string;
  author_avatar: string | null;
  date: string | null;
  url: string;
}

export interface GitPullRequest {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author_login: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  draft: boolean;
  additions?: number;
  deletions?: number;
  head_ref: string;
  base_ref: string;
  requested_reviewers: string[];
}

export interface GitBranch {
  name: string;
  protected: boolean;
  last_commit_sha: string;
}

export interface GitActionRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string | null;
  event: string;
  url: string;
  created_at: string;
  updated_at: string;
  actor_login: string | null;
  actor_avatar: string | null;
}

export interface GitHubEvent {
  id: string;
  repo_id: string;
  event_type: string;
  action: string | null;
  payload: Record<string, unknown>;
  actor_login: string | null;
  actor_avatar: string | null;
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
  activeNoteId: string | null;

  tasks: ProjectTask[];
  bugs: ProjectBug[];
  tickets: ProjectTicket[];
  files: ProjectFile[];
  updates: ProjectUpdate[];
  messages: ProjectMessage[];
  notes: ProjectNote[];
  timeEntries: TimeEntry[];
  runningTimer: RunningTimer | null;

  // Chat unread tracking: project_id → ISO timestamp of last read
  chatLastReadAt: Record<string, string>;

  // GitHub
  githubRepos: GitHubRepo[];
  commits: GitCommit[];
  pullRequests: GitPullRequest[];
  branches: GitBranch[];
  actionRuns: GitActionRun[];
  githubEvents: GitHubEvent[];
  gitLoading: boolean;
  gitError: string | null;
  gitLastFetched: string | null;

  detailPanelOpen: boolean;

  // Setters
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  setActiveTask: (id: string | null) => void;
  setActiveBug: (id: string | null) => void;
  setActiveTicket: (id: string | null) => void;
  setActiveNote: (id: string | null) => void;
  setTasks: (tasks: ProjectTask[]) => void;
  setBugs: (bugs: ProjectBug[]) => void;
  setTickets: (tickets: ProjectTicket[]) => void;
  setFiles: (files: ProjectFile[]) => void;
  setUpdates: (updates: ProjectUpdate[]) => void;
  setMessages: (messages: ProjectMessage[]) => void;
  setNotes: (notes: ProjectNote[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addTask: (task: ProjectTask) => void;
  updateTask: (id: string, updates: Partial<ProjectTask>) => void;
  addBug: (bug: ProjectBug) => void;
  updateBug: (id: string, updates: Partial<ProjectBug>) => void;
  addTicket: (ticket: ProjectTicket) => void;
  updateTicket: (id: string, updates: Partial<ProjectTicket>) => void;
  addNote: (note: ProjectNote) => void;
  updateNote: (id: string, updates: Partial<ProjectNote>) => void;
  removeNote: (id: string) => void;
  addFile: (file: ProjectFile) => void;
  removeFile: (id: string) => void;
  addMessage: (message: ProjectMessage) => void;
  setTimeEntries: (entries: TimeEntry[]) => void;
  addTimeEntry: (entry: TimeEntry) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  removeTimeEntry: (id: string) => void;
  setRunningTimer: (timer: RunningTimer | null) => void;
  markChatRead: (projectId: string) => void;
  getUnreadCount: (projectId: string) => number;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;

  // GitHub setters
  setGitHubRepos: (repos: GitHubRepo[]) => void;
  setCommits: (commits: GitCommit[]) => void;
  setPullRequests: (prs: GitPullRequest[]) => void;
  setBranches: (branches: GitBranch[]) => void;
  setActionRuns: (runs: GitActionRun[]) => void;
  setGitHubEvents: (events: GitHubEvent[]) => void;
  setGitLoading: (loading: boolean) => void;
  setGitError: (error: string | null) => void;
  setGitLastFetched: (ts: string | null) => void;
}

// ── Create store ────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeTaskId: null,
  activeBugId: null,
  activeTicketId: null,
  activeNoteId: null,

  tasks: [],
  bugs: [],
  tickets: [],
  files: [],
  updates: [],
  messages: [],
  notes: [],
  timeEntries: [],
  runningTimer: null,

  chatLastReadAt: {},

  // GitHub
  githubRepos: [],
  commits: [],
  pullRequests: [],
  branches: [],
  actionRuns: [],
  githubEvents: [],
  gitLoading: false,
  gitError: null,
  gitLastFetched: null,

  detailPanelOpen: true,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) =>
    set({ activeProjectId: id, activeTaskId: null, activeBugId: null, activeTicketId: null, activeNoteId: null }),
  setActiveTask: (id) => set({ activeTaskId: id }),
  setActiveBug: (id) => set({ activeBugId: id }),
  setActiveTicket: (id) => set({ activeTicketId: id }),
  setActiveNote: (id) => set({ activeNoteId: id }),
  setTasks: (tasks) => set({ tasks }),
  setBugs: (bugs) => set({ bugs }),
  setTickets: (tickets) => set({ tickets }),
  setFiles: (files) => set({ files }),
  setUpdates: (updates) => set({ updates }),
  setMessages: (messages) => set({ messages }),
  setNotes: (notes) => set({ notes }),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
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

  addNote: (note) =>
    set((state) => ({ notes: [...state.notes, note] })),
  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),
  removeNote: (id) =>
    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

  addFile: (file) =>
    set((state) => ({ files: [...state.files, file] })),
  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setTimeEntries: (entries) => set({ timeEntries: entries }),
  addTimeEntry: (entry) =>
    set((state) => ({ timeEntries: [entry, ...state.timeEntries] })),
  updateTimeEntry: (id, updates) =>
    set((state) => ({
      timeEntries: state.timeEntries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
  removeTimeEntry: (id) =>
    set((state) => ({ timeEntries: state.timeEntries.filter((e) => e.id !== id) })),
  setRunningTimer: (timer) => set({ runningTimer: timer }),

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

  // GitHub
  setGitHubRepos: (repos) => set({ githubRepos: repos }),
  setCommits: (commits) => set({ commits }),
  setPullRequests: (prs) => set({ pullRequests: prs }),
  setBranches: (branches) => set({ branches }),
  setActionRuns: (runs) => set({ actionRuns: runs }),
  setGitHubEvents: (events) => set({ githubEvents: events }),
  setGitLoading: (loading) => set({ gitLoading: loading }),
  setGitError: (error) => set({ gitError: error }),
  setGitLastFetched: (ts) => set({ gitLastFetched: ts }),
}));
