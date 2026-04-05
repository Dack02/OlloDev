-- =============================================================================
-- 00002_link_discussions.sql
-- Auto-link discussions to bugs, tasks, and tickets
-- =============================================================================

-- Add discussion_id FK to project_bugs
ALTER TABLE project_bugs
  ADD COLUMN discussion_id UUID REFERENCES discussions (id) ON DELETE SET NULL;

-- Add discussion_id FK to project_tasks
ALTER TABLE project_tasks
  ADD COLUMN discussion_id UUID REFERENCES discussions (id) ON DELETE SET NULL;

-- Add discussion_id FK to project_tickets
ALTER TABLE project_tickets
  ADD COLUMN discussion_id UUID REFERENCES discussions (id) ON DELETE SET NULL;

-- Add source tracking columns to discussions for bidirectional linking
ALTER TABLE discussions
  ADD COLUMN source_type TEXT,
  ADD COLUMN source_id   UUID;

-- Indexes for efficient lookups
CREATE INDEX idx_project_bugs_discussion    ON project_bugs    (discussion_id) WHERE discussion_id IS NOT NULL;
CREATE INDEX idx_project_tasks_discussion   ON project_tasks   (discussion_id) WHERE discussion_id IS NOT NULL;
CREATE INDEX idx_project_tickets_discussion ON project_tickets (discussion_id) WHERE discussion_id IS NOT NULL;
CREATE INDEX idx_discussions_source         ON discussions      (source_type, source_id) WHERE source_type IS NOT NULL;
