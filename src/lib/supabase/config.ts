/**
 * Central environment configuration.
 * Only NEXT_PUBLIC_* vars are readable in the browser — and they are public
 * by design (RLS protects the data). Secrets are read server-side only.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True when both public Supabase env vars are present. */
export const isSupabaseConfigured = (): boolean =>
  SUPABASE_URL.trim() !== '' && SUPABASE_ANON_KEY.trim() !== '';

/** True when the server-only service-role key is present (API routes). */
export const isServiceRoleConfigured = (): boolean =>
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim() !== '';
