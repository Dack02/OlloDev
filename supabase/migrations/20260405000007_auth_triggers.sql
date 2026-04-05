-- =============================================================================
-- Auth triggers: auto-create profile + default org membership on signup
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Seed default org
-- ---------------------------------------------------------------------------
INSERT INTO orgs (name, slug)
VALUES ('Ollo Dev', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Trigger function: handle new user signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Create profile row
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');

  -- Add to default org
  SELECT id INTO default_org_id FROM public.orgs WHERE slug = 'default' LIMIT 1;

  IF default_org_id IS NOT NULL THEN
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (default_org_id, NEW.id, 'member');
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Attach trigger to auth.users
-- ---------------------------------------------------------------------------
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Backfill: create profile rows for any existing users without one
-- ---------------------------------------------------------------------------
INSERT INTO profiles (id, email, display_name)
SELECT u.id, u.email, u.raw_user_meta_data->>'display_name'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- ---------------------------------------------------------------------------
-- 5. Backfill: add existing users to default org if not already members
-- ---------------------------------------------------------------------------
INSERT INTO org_members (org_id, user_id, role)
SELECT o.id, u.id, 'member'
FROM auth.users u
CROSS JOIN orgs o
WHERE o.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM org_members om
    WHERE om.org_id = o.id AND om.user_id = u.id
  );
