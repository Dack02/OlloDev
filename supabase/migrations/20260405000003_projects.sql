-- =============================================================================
-- 00002_projects.sql
-- Projects + project_bugs tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  color                TEXT NOT NULL DEFAULT '#3b82f6',
  status               TEXT NOT NULL DEFAULT 'planning',
  owner_id             UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  channel_id           UUID REFERENCES channels (id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_project_status CHECK (status IN ('planning', 'active', 'paused', 'completed'))
);

CREATE INDEX idx_projects_org_id    ON projects (org_id);
CREATE INDEX idx_projects_owner_id  ON projects (owner_id);
CREATE INDEX idx_projects_status    ON projects (org_id, status);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. project_bugs
-- ---------------------------------------------------------------------------
CREATE TABLE project_bugs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  priority     TEXT NOT NULL DEFAULT 'medium',
  severity     TEXT NOT NULL DEFAULT 'medium',
  assignee_id  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reporter_id  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  labels       TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bug_status   CHECK (status IN ('open', 'confirmed', 'in_progress', 'fixed', 'closed')),
  CONSTRAINT chk_bug_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT chk_bug_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_project_bugs_project_id   ON project_bugs (project_id);
CREATE INDEX idx_project_bugs_status       ON project_bugs (project_id, status);
CREATE INDEX idx_project_bugs_assignee_id  ON project_bugs (assignee_id);
CREATE INDEX idx_project_bugs_labels       ON project_bugs USING GIN (labels);

CREATE TRIGGER trg_project_bugs_updated_at
  BEFORE UPDATE ON project_bugs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_bugs ENABLE ROW LEVEL SECURITY;

-- projects: org members can read, owners/admins can write
CREATE POLICY projects_select ON projects
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY projects_update ON projects
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY projects_delete ON projects
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- project_bugs: accessible if user is member of the project's org
CREATE POLICY project_bugs_select ON project_bugs
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY project_bugs_insert ON project_bugs
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY project_bugs_update ON project_bugs
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY project_bugs_delete ON project_bugs
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN org_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );
