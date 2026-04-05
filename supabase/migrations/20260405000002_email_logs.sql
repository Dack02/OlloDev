-- ============================================================
-- Email logs table for audit/debugging of Resend sends
-- ============================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  to_address  text NOT NULL,
  subject     text NOT NULL,
  resend_message_id text,
  status      text NOT NULL DEFAULT 'sent',
  error       text,
  created_at  timestamptz DEFAULT now()
);

-- Index for org lookup and recent logs
CREATE INDEX idx_email_logs_org_id ON email_logs(org_id);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- RLS: service role only (no user access to email logs directly)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Supabase service role bypasses RLS by default)
-- No user-facing policies needed since this is internal audit data
