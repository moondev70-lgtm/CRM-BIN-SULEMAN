import { NextResponse, type NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Invites a new team member. Requires an ACTIVE admin session, then uses
 * the server-only service role to create the auth user (invite email) and
 * set the intended role. Returns 503 when the service key is not configured.
 */
export async function POST(req: NextRequest) {
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

  let body: { email?: string; display_name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const displayName = (body.display_name ?? '').trim();
  const role = body.role === 'admin' ? 'admin' : 'agent';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  const { error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName || email.split('@')[0] },
  });
  if (inviteError) {
    const msg = /already/i.test(inviteError.message)
      ? 'That email already has an account.'
      : inviteError.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // The auth trigger seeds crm_users as 'agent'; apply the intended role/name.
  // (Invite completes asynchronously — retry the upsert briefly.)
  for (let i = 0; i < 5; i++) {
    const { data: authUser } = await service.auth.admin.listUsers({ page: i + 1, perPage: 200 });
    const match = authUser?.users?.find((u) => u.email?.toLowerCase() === email);
    if (match) {
      const { error: upsertError } = await service.from('crm_users').upsert(
        {
          user_id: match.id,
          email,
          display_name: displayName || email.split('@')[0],
          role,
        },
        { onConflict: 'user_id' },
      );
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return NextResponse.json({ ok: true });
}