-- =============================================================================
-- 00001_init.sql
-- Ollo Dev – initial database schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. orgs
-- ---------------------------------------------------------------------------
CREATE TABLE orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON orgs (slug);

CREATE TRIGGER trg_orgs_updated_at
  BEFORE UPDATE ON orgs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  locale        TEXT NOT NULL DEFAULT 'en',
  theme         TEXT NOT NULL DEFAULT 'system',
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  status        TEXT NOT NULL DEFAULT 'offline',
  status_text   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles (email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. org_members
-- ---------------------------------------------------------------------------
CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  permissions JSONB NOT NULL DEFAULT '{}',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_org_id   ON org_members (org_id);
CREATE INDEX idx_org_members_user_id  ON org_members (user_id);

-- ---------------------------------------------------------------------------
-- 4. channels
-- ---------------------------------------------------------------------------
CREATE TABLE channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'public',
  created_by  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX idx_channels_org_id ON channels (org_id);
CREATE INDEX idx_channels_slug   ON channels (slug);

CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. channel_members
-- ---------------------------------------------------------------------------
CREATE TABLE channel_members (
  channel_id      UUID NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',
  last_read_at    TIMESTAMPTZ,
  notifications   TEXT NOT NULL DEFAULT 'all',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user_id ON channel_members (user_id);

-- ---------------------------------------------------------------------------
-- 6. messages
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
  author_id     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  parent_id     UUID REFERENCES messages (id) ON DELETE SET NULL,
  content       TEXT,
  content_html  TEXT,
  attachments   JSONB NOT NULL DEFAULT '[]',
  reactions     JSONB NOT NULL DEFAULT '{}',
  is_edited     BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_channel_created ON messages (channel_id, created_at DESC);
CREATE INDEX idx_messages_parent_id       ON messages (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_messages_author_id       ON messages (author_id);
CREATE INDEX idx_messages_fts             ON messages USING GIN (to_tsvector('english', COALESCE(content, '')));

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. discussions
-- ---------------------------------------------------------------------------
CREATE TABLE discussions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  body_html   TEXT,
  author_id   UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  category    TEXT,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  upvotes     INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discussions_org_id    ON discussions (org_id);
CREATE INDEX idx_discussions_author_id ON discussions (author_id);
CREATE INDEX idx_discussions_category  ON discussions (org_id, category);
CREATE INDEX idx_discussions_tags      ON discussions USING GIN (tags);

CREATE TRIGGER trg_discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. discussion_replies
-- ---------------------------------------------------------------------------
CREATE TABLE discussion_replies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id  UUID NOT NULL REFERENCES discussions (id) ON DELETE CASCADE,
  author_id      UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  parent_id      UUID REFERENCES discussion_replies (id) ON DELETE SET NULL,
  body           TEXT,
  body_html      TEXT,
  is_accepted    BOOLEAN NOT NULL DEFAULT FALSE,
  upvotes        INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discussion_replies_discussion_id ON discussion_replies (discussion_id);
CREATE INDEX idx_discussion_replies_author_id     ON discussion_replies (author_id);
CREATE INDEX idx_discussion_replies_parent_id     ON discussion_replies (parent_id) WHERE parent_id IS NOT NULL;

CREATE TRIGGER trg_discussion_replies_updated_at
  BEFORE UPDATE ON discussion_replies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. wiki_spaces
-- ---------------------------------------------------------------------------
CREATE TABLE wiki_spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX idx_wiki_spaces_org_id ON wiki_spaces (org_id);

-- ---------------------------------------------------------------------------
-- 10. wiki_pages
-- ---------------------------------------------------------------------------
CREATE TABLE wiki_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        UUID NOT NULL REFERENCES wiki_spaces (id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES wiki_pages (id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  content         TEXT,
  content_html    TEXT,
  author_id       UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  last_edited_by  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (space_id, slug)
);

CREATE INDEX idx_wiki_pages_space_id  ON wiki_pages (space_id);
CREATE INDEX idx_wiki_pages_parent_id ON wiki_pages (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_wiki_pages_fts       ON wiki_pages USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

CREATE TRIGGER trg_wiki_pages_updated_at
  BEFORE UPDATE ON wiki_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. wiki_page_versions
-- ---------------------------------------------------------------------------
CREATE TABLE wiki_page_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES wiki_pages (id) ON DELETE CASCADE,
  content     TEXT,
  edited_by   UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  change_note TEXT,
  version     INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wiki_page_versions_page_id ON wiki_page_versions (page_id, version DESC);

-- ---------------------------------------------------------------------------
-- 12. ticket_queues
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_queues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL,
  description    TEXT,
  color          TEXT,
  -- sla_policy_id FK added after sla_policies is created (see ALTER TABLE below)
  sla_policy_id  UUID,
  auto_assign    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX idx_ticket_queues_org_id ON ticket_queues (org_id);

-- ---------------------------------------------------------------------------
-- 13. tickets
-- ---------------------------------------------------------------------------
CREATE TABLE tickets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  queue_id             UUID REFERENCES ticket_queues (id) ON DELETE SET NULL,
  subject              TEXT NOT NULL,
  description          TEXT,
  description_html     TEXT,
  status               TEXT NOT NULL DEFAULT 'open',
  priority             TEXT NOT NULL DEFAULT 'normal',
  type                 TEXT NOT NULL DEFAULT 'question',
  requester_id         UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  assignee_id          UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  -- sla_policy_id FK added after sla_policies is created (see ALTER TABLE below)
  sla_policy_id        UUID,
  sla_breach_at        TIMESTAMPTZ,
  first_response_at    TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  due_at               TIMESTAMPTZ,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  custom_fields        JSONB NOT NULL DEFAULT '{}',
  satisfaction_rating  SMALLINT CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_org_id       ON tickets (org_id);
CREATE INDEX idx_tickets_queue_id     ON tickets (queue_id);
CREATE INDEX idx_tickets_requester_id ON tickets (requester_id);
CREATE INDEX idx_tickets_assignee_id  ON tickets (assignee_id);
CREATE INDEX idx_tickets_status       ON tickets (org_id, status);
CREATE INDEX idx_tickets_priority     ON tickets (org_id, priority);
CREATE INDEX idx_tickets_sla_breach   ON tickets (sla_breach_at) WHERE sla_breach_at IS NOT NULL AND status NOT IN ('resolved', 'closed');
CREATE INDEX idx_tickets_tags         ON tickets USING GIN (tags);
CREATE INDEX idx_tickets_created_at   ON tickets (org_id, created_at DESC);

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 14. ticket_comments
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  author_id    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  body         TEXT,
  body_html    TEXT,
  is_internal  BOOLEAN NOT NULL DEFAULT FALSE,
  attachments  JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments (ticket_id, created_at);
CREATE INDEX idx_ticket_comments_author_id ON ticket_comments (author_id);

CREATE TRIGGER trg_ticket_comments_updated_at
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 15. ticket_activity
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  old_value  JSONB,
  new_value  JSONB,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_activity_ticket_id ON ticket_activity (ticket_id, created_at DESC);
CREATE INDEX idx_ticket_activity_actor_id  ON ticket_activity (actor_id);

-- ---------------------------------------------------------------------------
-- 16. sla_policies
-- ---------------------------------------------------------------------------
CREATE TABLE sla_policies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  -- response_times: minutes per priority key (urgent, high, normal, low)
  response_times   JSONB NOT NULL DEFAULT '{"urgent": 60, "high": 240, "normal": 480, "low": 1440}',
  -- resolution_times: minutes per priority key
  resolution_times JSONB NOT NULL DEFAULT '{"urgent": 240, "high": 480, "normal": 1440, "low": 4320}',
  business_hours   BOOLEAN NOT NULL DEFAULT FALSE,
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sla_policies_org_id ON sla_policies (org_id);

CREATE TRIGGER trg_sla_policies_updated_at
  BEFORE UPDATE ON sla_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 17. canned_responses
-- ---------------------------------------------------------------------------
CREATE TABLE canned_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT,
  shortcut    TEXT,
  created_by  UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  is_shared   BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_canned_responses_org_id   ON canned_responses (org_id);
CREATE INDEX idx_canned_responses_category ON canned_responses (org_id, category);
CREATE INDEX idx_canned_responses_shortcut ON canned_responses (org_id, shortcut) WHERE shortcut IS NOT NULL;

CREATE TRIGGER trg_canned_responses_updated_at
  BEFORE UPDATE ON canned_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 18. notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  org_id     UUID REFERENCES orgs (id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id      ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread       ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_org_id       ON notifications (org_id);

-- ---------------------------------------------------------------------------
-- 19. api_keys
-- ---------------------------------------------------------------------------
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  key_prefix   TEXT NOT NULL,
  permissions  JSONB NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org_id     ON api_keys (org_id);
CREATE INDEX idx_api_keys_key_hash   ON api_keys (key_hash);
CREATE INDEX idx_api_keys_created_by ON api_keys (created_by);

-- =============================================================================
-- Deferred foreign keys (reference tables defined later in this file)
-- =============================================================================
ALTER TABLE ticket_queues
  ADD CONSTRAINT fk_ticket_queues_sla_policy
  FOREIGN KEY (sla_policy_id) REFERENCES sla_policies (id) ON DELETE SET NULL;

ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_sla_policy
  FOREIGN KEY (sla_policy_id) REFERENCES sla_policies (id) ON DELETE SET NULL;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE orgs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_spaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_queues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- orgs: users can see orgs they are a member of
-- ---------------------------------------------------------------------------
CREATE POLICY orgs_select_member
  ON orgs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- profiles: users can read and update their own profile
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_own
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- org_members: visible to other members of the same org
-- ---------------------------------------------------------------------------
CREATE POLICY org_members_select_same_org
  ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members AS my_membership
      WHERE my_membership.org_id = org_members.org_id
        AND my_membership.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- channels: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY channels_select_org_member
  ON channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = channels.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- channel_members: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY channel_members_select_org_member
  ON channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels
      JOIN org_members ON org_members.org_id = channels.org_id
      WHERE channels.id = channel_members.channel_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- messages: visible to channel members
-- ---------------------------------------------------------------------------
CREATE POLICY messages_select_channel_member
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = messages.channel_id
        AND channel_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- discussions: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY discussions_select_org_member
  ON discussions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = discussions.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- discussion_replies: visible to org members (via discussion)
-- ---------------------------------------------------------------------------
CREATE POLICY discussion_replies_select_org_member
  ON discussion_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM discussions
      JOIN org_members ON org_members.org_id = discussions.org_id
      WHERE discussions.id = discussion_replies.discussion_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- wiki_spaces: public spaces visible to all org members; private to members
-- ---------------------------------------------------------------------------
CREATE POLICY wiki_spaces_select_org_member
  ON wiki_spaces FOR SELECT
  USING (
    is_public = TRUE
    OR EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = wiki_spaces.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- wiki_pages: follows wiki_space visibility
-- ---------------------------------------------------------------------------
CREATE POLICY wiki_pages_select_via_space
  ON wiki_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wiki_spaces
      WHERE wiki_spaces.id = wiki_pages.space_id
        AND (
          wiki_spaces.is_public = TRUE
          OR EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = wiki_spaces.org_id
              AND org_members.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- wiki_page_versions: same access as wiki_pages
-- ---------------------------------------------------------------------------
CREATE POLICY wiki_page_versions_select_via_page
  ON wiki_page_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wiki_pages
      JOIN wiki_spaces ON wiki_spaces.id = wiki_pages.space_id
      WHERE wiki_pages.id = wiki_page_versions.page_id
        AND (
          wiki_spaces.is_public = TRUE
          OR EXISTS (
            SELECT 1 FROM org_members
            WHERE org_members.org_id = wiki_spaces.org_id
              AND org_members.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- ticket_queues: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY ticket_queues_select_org_member
  ON ticket_queues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = ticket_queues.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- tickets:
--   agents (role IN ('agent','admin','owner')) see all org tickets
--   customers see their own tickets
-- ---------------------------------------------------------------------------
CREATE POLICY tickets_select_agent
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = tickets.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('agent', 'admin', 'owner')
    )
  );

CREATE POLICY tickets_select_customer_own
  ON tickets FOR SELECT
  USING (requester_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ticket_comments:
--   agents see all comments; customers see only public comments on own tickets
-- ---------------------------------------------------------------------------
CREATE POLICY ticket_comments_select_agent
  ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      JOIN org_members ON org_members.org_id = tickets.org_id
      WHERE tickets.id = ticket_comments.ticket_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('agent', 'admin', 'owner')
    )
  );

CREATE POLICY ticket_comments_select_customer_own
  ON ticket_comments FOR SELECT
  USING (
    is_internal = FALSE
    AND EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
        AND tickets.requester_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ticket_activity: visible to agents only
-- ---------------------------------------------------------------------------
CREATE POLICY ticket_activity_select_agent
  ON ticket_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      JOIN org_members ON org_members.org_id = tickets.org_id
      WHERE tickets.id = ticket_activity.ticket_id
        AND org_members.user_id = auth.uid()
        AND org_members.role IN ('agent', 'admin', 'owner')
    )
  );

-- ---------------------------------------------------------------------------
-- sla_policies: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY sla_policies_select_org_member
  ON sla_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = sla_policies.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- canned_responses: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY canned_responses_select_org_member
  ON canned_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = canned_responses.org_id
        AND org_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- notifications: visible to the owning user only
-- ---------------------------------------------------------------------------
CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- api_keys: visible to org members
-- ---------------------------------------------------------------------------
CREATE POLICY api_keys_select_org_member
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = api_keys.org_id
        AND org_members.user_id = auth.uid()
    )
  );
