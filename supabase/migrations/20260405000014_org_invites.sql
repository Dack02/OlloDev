-- ---------------------------------------------------------------------------
-- org_invites: track pending member invitations
-- ---------------------------------------------------------------------------
CREATE TABLE org_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  invited_by  UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, email)
);

CREATE INDEX idx_org_invites_org_id ON org_invites (org_id);
CREATE INDEX idx_org_invites_email  ON org_invites (email);

CREATE TRIGGER trg_org_invites_updated_at
  BEFORE UPDATE ON org_invites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_invites_select_org_member
  ON org_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_invites.org_id
        AND org_members.user_id = auth.uid()
    )
  );
