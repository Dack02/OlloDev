-- =============================================================================
-- 00002_webhooks.sql
-- Add webhooks table for webhook configuration management
-- =============================================================================

CREATE TABLE webhooks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  events     TEXT[] NOT NULL DEFAULT '{}',
  secret     TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_org_id ON webhooks (org_id);
CREATE INDEX idx_webhooks_is_active ON webhooks (org_id, is_active);

CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's webhooks
CREATE POLICY webhooks_select_org_member
  ON webhooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = webhooks.org_id
        AND org_members.user_id = auth.uid()
    )
  );
