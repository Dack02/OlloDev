-- =============================================================================
-- Project details metadata
-- =============================================================================

ALTER TABLE projects
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN health TEXT NOT NULL DEFAULT 'on_track',
  ADD COLUMN client_name TEXT,
  ADD COLUMN project_url TEXT,
  ADD COLUMN repository_url TEXT,
  ADD COLUMN start_date DATE,
  ADD COLUMN target_date DATE,
  ADD COLUMN key_outcome TEXT;

ALTER TABLE projects
  ADD CONSTRAINT chk_project_priority
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE projects
  ADD CONSTRAINT chk_project_health
  CHECK (health IN ('on_track', 'at_risk', 'off_track'));

CREATE INDEX idx_projects_target_date ON projects (target_date);
