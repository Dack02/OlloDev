-- Link discussions to projects (optional)
-- Discussions without a project_id remain org-wide.

ALTER TABLE discussions
  ADD COLUMN project_id UUID REFERENCES projects (id) ON DELETE SET NULL;

-- Partial index for project-scoped lookups
CREATE INDEX idx_discussions_project_id
  ON discussions (project_id)
  WHERE project_id IS NOT NULL;

-- Composite index for listing all discussions within an org filtered by project
CREATE INDEX idx_discussions_org_project
  ON discussions (org_id, project_id);
