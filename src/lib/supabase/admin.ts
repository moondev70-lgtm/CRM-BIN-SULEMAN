import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, isServiceRoleConfigured } from './config';

let adminClient: SupabaseClient | null = null;

/**
 * SERVER-ONLY service-role client (bypasses RLS).
 *
 * Allowed consumers (Phase 2+): webhook ingestion and the sync worker.
 * In Phase 1 it is used ONLY by /api/team (invite/deactivate agents).
 * NEVER import this module from a client component.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!isServiceRoleConfigured() || SUPABASE_URL.trim() === '') return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
