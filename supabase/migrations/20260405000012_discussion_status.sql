-- =============================================================================
-- 00012_discussion_status.sql
-- Add status lifecycle (open/closed/archived) to discussions
-- =============================================================================

-- Status column with check constraint
ALTER TABLE discussions
  ADD COLUMN status       TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'archived'));

-- Close metadata
ALTER TABLE discussions
  ADD COLUMN closed_at    TIMESTAMPTZ,
  ADD COLUMN closed_by    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN close_reason TEXT;

-- Index for org + status filtering (most common query pattern)
CREATE INDEX idx_discussions_status ON discussions (org_id, status);
