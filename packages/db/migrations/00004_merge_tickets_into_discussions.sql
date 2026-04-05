-- =============================================================================
-- 00004_merge_tickets_into_discussions.sql
-- Merge project tickets into discussions by adding ticket-specific columns
-- =============================================================================

ALTER TABLE discussions
  ADD COLUMN assignee_id      UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN priority         TEXT,
  ADD COLUMN requester_name   TEXT,
  ADD COLUMN requester_email  TEXT;

CREATE INDEX idx_discussions_assignee    ON discussions (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_discussions_category    ON discussions (org_id, category);
CREATE INDEX idx_discussions_priority    ON discussions (priority) WHERE priority IS NOT NULL;
