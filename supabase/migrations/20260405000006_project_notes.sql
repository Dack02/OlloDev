-- Project Notes
-- Shared notes within a project (meeting notes, decision logs, scratchpads)

CREATE TABLE project_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  author_id    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  color        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_notes_project_id ON project_notes (project_id);
CREATE INDEX idx_project_notes_author_id  ON project_notes (author_id);

CREATE TRIGGER trg_project_notes_updated_at
  BEFORE UPDATE ON project_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_notes_all ON project_notes
  FOR ALL USING (is_project_member(project_id))
  WITH CHECK (is_project_member(project_id));
