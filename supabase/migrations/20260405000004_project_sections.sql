-- =============================================================================
-- 00004_project_sections.sql
-- project_tasks, project_tickets, project_files, project_messages
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. project_tasks (Dev tab: tasks, ideas, improvements)
-- ---------------------------------------------------------------------------
CREATE TABLE project_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL DEFAULT 'task',
  status       TEXT NOT NULL DEFAULT 'backlog',
  priority     TEXT NOT NULL DEFAULT 'medium',
  assignee_id  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  due_at       TIMESTAMPTZ,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_task_type     CHECK (type IN ('task', 'idea', 'improvement')),
  CONSTRAINT chk_task_status   CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  CONSTRAINT chk_task_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX idx_project_tasks_project_id   ON project_tasks (project_id);
CREATE INDEX idx_project_tasks_status       ON project_tasks (project_id, status);
CREATE INDEX idx_project_tasks_assignee_id  ON project_tasks (assignee_id);
CREATE INDEX idx_project_tasks_type         ON project_tasks (project_id, type);
CREATE INDEX idx_project_tasks_tags         ON project_tasks USING GIN (tags);

CREATE TRIGGER trg_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. project_tickets (Support tickets scoped to a project)
-- ---------------------------------------------------------------------------
CREATE TABLE project_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'open',
  priority         TEXT NOT NULL DEFAULT 'medium',
  type             TEXT NOT NULL DEFAULT 'question',
  requester_name   TEXT,
  requester_email  TEXT,
  assignee_id      UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_pticket_status   CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed')),
  CONSTRAINT chk_pticket_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT chk_pticket_type     CHECK (type IN ('question', 'bug', 'feature', 'task'))
);

CREATE INDEX idx_project_tickets_project_id   ON project_tickets (project_id);
CREATE INDEX idx_project_tickets_status       ON project_tickets (project_id, status);
CREATE INDEX idx_project_tickets_assignee_id  ON project_tickets (assignee_id);

CREATE TRIGGER trg_project_tickets_updated_at
  BEFORE UPDATE ON project_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. project_files
-- ---------------------------------------------------------------------------
CREATE TABLE project_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'application/octet-stream',
  size         BIGINT NOT NULL DEFAULT 0,
  uploaded_by  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_files_project_id ON project_files (project_id);

-- ---------------------------------------------------------------------------
-- 4. project_messages (Project chat channel)
-- ---------------------------------------------------------------------------
CREATE TABLE project_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  author_id    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_messages_project_id ON project_messages (project_id, created_at DESC);
CREATE INDEX idx_project_messages_author_id  ON project_messages (author_id);

-- ---------------------------------------------------------------------------
-- 5. RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- Shared RLS pattern: org member of the project's org can access
-- Using a helper function to avoid repetition
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    JOIN org_members om ON om.org_id = p.org_id
    WHERE p.id = p_project_id
      AND om.user_id = auth.uid()
  );
$$;

-- project_tasks
CREATE POLICY project_tasks_all ON project_tasks
  FOR ALL USING (is_project_member(project_id))
  WITH CHECK (is_project_member(project_id));

-- project_tickets
CREATE POLICY project_tickets_all ON project_tickets
  FOR ALL USING (is_project_member(project_id))
  WITH CHECK (is_project_member(project_id));

-- project_files
CREATE POLICY project_files_all ON project_files
  FOR ALL USING (is_project_member(project_id))
  WITH CHECK (is_project_member(project_id));

-- project_messages
CREATE POLICY project_messages_all ON project_messages
  FOR ALL USING (is_project_member(project_id))
  WITH CHECK (is_project_member(project_id));
