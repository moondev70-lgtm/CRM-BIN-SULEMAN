import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config';

/** Re-exported from config so browser-only helpers are always in one place. */
export { isSupabaseConfigured } from './config';

let client: SupabaseClient | null = null;

/**
 * Browser-side Supabase client (anon key only; every query is RLS-scoped to
 * the signed-in user). Returns null when env vars are missing so pages can
 * render a configuration notice instead of crashing.
 */
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
