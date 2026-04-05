-- =============================================================================
-- Seed: test users for local development
-- =============================================================================
-- Credentials:
--   admin@ollodev.test / password123
--   user@ollodev.test  / password123
-- =============================================================================

-- Insert test users into auth.users
-- The handle_new_user() trigger auto-creates profiles + org_members rows

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'admin@ollodev.test',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"display_name": "Admin User"}'::jsonb,
  NOW(), NOW(),
  '', '', '', ''
), (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-0000-0000-0000-000000000002',
  'authenticated', 'authenticated',
  'user@ollodev.test',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"display_name": "Test User"}'::jsonb,
  NOW(), NOW(),
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Insert identities (required for Supabase auth to work)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  '{"sub": "a1b2c3d4-0000-0000-0000-000000000001", "email": "admin@ollodev.test"}'::jsonb,
  'email', 'a1b2c3d4-0000-0000-0000-000000000001',
  NOW(), NOW(), NOW()
), (
  'a1b2c3d4-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000002',
  '{"sub": "a1b2c3d4-0000-0000-0000-000000000002", "email": "user@ollodev.test"}'::jsonb,
  'email', 'a1b2c3d4-0000-0000-0000-000000000002',
  NOW(), NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- Promote admin user to 'owner' role in the default org
UPDATE org_members
SET role = 'owner'
WHERE user_id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND org_id = (SELECT id FROM orgs WHERE slug = 'default');
