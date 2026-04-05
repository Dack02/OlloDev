import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

/**
 * Creates a Supabase client with the service role key.
 * Bypasses RLS — use only for trusted server-side operations.
 */
export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a Supabase client authenticated as a specific user via their JWT.
 * Respects RLS policies.
 */
export function createUserClient(accessToken: string) {
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
