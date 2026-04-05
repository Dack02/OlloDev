-- =============================================================================
-- 00009_time_entries.sql
-- Time tracking: clock on/off projects, manual entries, per-task tracking
-- =============================================================================

CREATE TABLE time_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id           UUID REFERENCES project_tasks (id) ON DELETE SET NULL,
  description       TEXT,
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  duration_seconds  INT,
  is_manual         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_time_entries_org_project   ON time_entries (org_id, project_id);
CREATE INDEX idx_time_entries_org_user      ON time_entries (org_id, user_id);
CREATE INDEX idx_time_entries_user_running  ON time_entries (user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_time_entries_project_range ON time_entries (project_id, started_at);

-- Partial unique index: one running timer per user
CREATE UNIQUE INDEX uq_time_entries_one_running_per_user
  ON time_entries (user_id) WHERE ended_at IS NULL;

-- Updated-at trigger
CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_entries_all ON time_entries
  FOR ALL USING (is_project_member(project_id))
  WITH CHECK (is_project_member(project_id));
