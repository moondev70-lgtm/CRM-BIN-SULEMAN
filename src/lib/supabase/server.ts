import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config';

/**
 * Server-side Supabase client bound to the request cookies (anon key; RLS
 * still applies — this is the *user's* identity, never the service role).
 * Use in Server Components and Route Handlers.
 */
export function getServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const store = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: middleware refreshes sessions,
          // so cookie writes here can safely be ignored.
        }
      },
    },
  });
}
