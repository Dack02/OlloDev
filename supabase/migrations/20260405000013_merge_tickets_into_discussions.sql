-- =============================================================================
-- 00013_merge_tickets_into_discussions.sql
-- Merge project tickets into discussions by adding ticket-specific columns
-- =============================================================================

-- Add ticket-specific columns to discussions
ALTER TABLE discussions
  ADD COLUMN assignee_id      UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN priority         TEXT,
  ADD COLUMN requester_name   TEXT,
  ADD COLUMN requester_email  TEXT;

-- Indexes
CREATE INDEX idx_discussions_assignee    ON discussions (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_discussions_priority    ON discussions (priority) WHERE priority IS NOT NULL;

-- Migrate existing project_tickets that already have linked discussions:
-- Update the linked discussion with ticket metadata
UPDATE discussions d
SET
  category       = 'tickets',
  assignee_id    = pt.assignee_id,
  priority       = pt.priority,
  requester_name = pt.requester_name,
  requester_email = pt.requester_email,
  tags           = ARRAY[pt.type] || ARRAY['auto-thread']
FROM project_tickets pt
WHERE pt.discussion_id = d.id;

-- Migrate project_tickets that have NO linked discussion:
-- Create new discussion rows for them
INSERT INTO discussions (
  org_id, project_id, title, body, author_id, category, tags,
  status, assignee_id, priority, requester_name, requester_email,
  source_type, source_id
)
SELECT
  p.org_id,
  pt.project_id,
  pt.title,
  COALESCE(pt.description, 'Migrated from project ticket'),
  pt.assignee_id,
  'tickets',
  ARRAY[pt.type],
  CASE
    WHEN pt.status IN ('resolved', 'closed') THEN 'closed'
    ELSE 'open'
  END,
  pt.assignee_id,
  pt.priority,
  pt.requester_name,
  pt.requester_email,
  'migrated_ticket',
  pt.id
FROM project_tickets pt
JOIN projects p ON p.id = pt.project_id
WHERE pt.discussion_id IS NULL;

-- project_tickets kept for rollback safety; drop in a future migration.
