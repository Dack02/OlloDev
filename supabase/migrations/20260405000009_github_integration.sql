-- =============================================================================
-- GitHub integration tables
-- =============================================================================

-- GitHub App installations (one per org)
CREATE TABLE github_installations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  installation_id  BIGINT NOT NULL UNIQUE,
  account_login    TEXT NOT NULL,
  account_type     TEXT NOT NULL DEFAULT 'Organization',
  permissions      JSONB NOT NULL DEFAULT '{}',
  events           TEXT[] NOT NULL DEFAULT '{}',
  installed_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  suspended_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_github_installations_org_id ON github_installations (org_id);

CREATE TRIGGER trg_github_installations_updated_at
  BEFORE UPDATE ON github_installations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Linked repos (supports multi-repo per project)
CREATE TABLE github_repos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  installation_id   UUID NOT NULL REFERENCES github_installations (id) ON DELETE CASCADE,
  github_repo_id    BIGINT NOT NULL,
  full_name         TEXT NOT NULL,
  default_branch    TEXT NOT NULL DEFAULT 'main',
  is_primary        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, github_repo_id)
);

CREATE INDEX idx_github_repos_project_id ON github_repos (project_id);
CREATE INDEX idx_github_repos_installation_id ON github_repos (installation_id);

CREATE TRIGGER trg_github_repos_updated_at
  BEFORE UPDATE ON github_repos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Cached webhook events for activity feed
CREATE TABLE github_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id       UUID NOT NULL REFERENCES github_repos (id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  action        TEXT,
  payload       JSONB NOT NULL DEFAULT '{}',
  actor_login   TEXT,
  actor_avatar  TEXT,
  github_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_github_events_repo_created ON github_events (repo_id, created_at DESC);
CREATE INDEX idx_github_events_type ON github_events (repo_id, event_type);
CREATE UNIQUE INDEX idx_github_events_dedup ON github_events (github_id) WHERE github_id IS NOT NULL;

-- PR ↔ dev item links
CREATE TABLE github_pr_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id     UUID NOT NULL REFERENCES github_repos (id) ON DELETE CASCADE,
  pr_number   INT NOT NULL,
  pr_title    TEXT NOT NULL,
  pr_state    TEXT NOT NULL DEFAULT 'open',
  pr_url      TEXT NOT NULL,
  item_type   TEXT NOT NULL,
  item_id     UUID NOT NULL,
  auto_linked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (repo_id, pr_number, item_type, item_id)
);

CREATE INDEX idx_github_pr_links_item ON github_pr_links (item_type, item_id);
CREATE INDEX idx_github_pr_links_repo ON github_pr_links (repo_id, pr_number);

CREATE TRIGGER trg_github_pr_links_updated_at
  BEFORE UPDATE ON github_pr_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-org GitHub settings
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS github_settings JSONB NOT NULL DEFAULT '{}';

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_pr_links ENABLE ROW LEVEL SECURITY;

-- github_installations: org members can read
CREATE POLICY github_installations_select ON github_installations
  FOR SELECT USING (
    org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid())
  );

-- github_repos: accessible if user is member of the project's org
CREATE POLICY github_repos_select ON github_repos
  FOR SELECT USING (is_project_member(project_id));

-- github_events: via repo → project membership
CREATE POLICY github_events_select ON github_events
  FOR SELECT USING (
    repo_id IN (SELECT gr.id FROM github_repos gr WHERE is_project_member(gr.project_id))
  );

-- github_pr_links: via repo → project membership
CREATE POLICY github_pr_links_select ON github_pr_links
  FOR SELECT USING (
    repo_id IN (SELECT gr.id FROM github_repos gr WHERE is_project_member(gr.project_id))
  );
