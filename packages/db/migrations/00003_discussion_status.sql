-- =============================================================================
-- 00003_discussion_status.sql
-- Add status lifecycle (open/closed/archived) to discussions
-- =============================================================================

ALTER TABLE discussions
  ADD COLUMN status       TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'archived'));

ALTER TABLE discussions
  ADD COLUMN closed_at    TIMESTAMPTZ,
  ADD COLUMN closed_by    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN close_reason TEXT;

CREATE INDEX idx_discussions_status ON discussions (org_id, status);
