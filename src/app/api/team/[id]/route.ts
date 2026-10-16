import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Admin-only team mutation: role, display name, active flag.
 * Deactivation flips crm_users.active (RLS immediately blocks data access)
 * and additionally bans the auth user from signing in.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('crm_users')
    .select('role, active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.active || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: 'Service role key not configured (SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 },
    );
  }

  let body: { active?: boolean; assignment_enabled?: boolean; role?: string; display_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const userId = params.id;
  if (userId === user.id && body.active === false) {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.active === 'boolean') {
    patch.active = body.active;
    patch.deactivated_at = body.active ? null : new Date().toISOString();
  }
  if (typeof body.assignment_enabled === 'boolean') patch.assignment_enabled = body.assignment_enabled;
  if (body.role === 'admin' || body.role === 'agent') patch.role = body.role;
  if (typeof body.display_name === 'string') patch.display_name = body.display_name.trim();

  const { error: updateError } = await service
    .from('crm_users')
    .update(patch)
    .eq('user_id', userId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let warning: string | undefined;
  if (typeof body.active === 'boolean') {
    try {
      await service.auth.admin.updateUserById(userId, {
        ban_duration: body.active ? 'none' : '100y',
      });
    } catch {
      warning =
        'Sign-in ban could not be set — data access is still blocked by the database, but consider rotating their password.';
    }
  }

  return NextResponse.json({ ok: true, ...(warning ? { warning } : {}) });
}