import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { leadsToCsv } from '@/lib/csv';
import type { CrmUserRow, LeadRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * CSV export of every lead the signed-in user is authorized to see.
 * Authorization comes from Row Level Security (agents → own leads only;
 * admins → all leads). The server client uses the caller's session — the
 * service-role key is deliberately NOT used here.
 */
export async function GET() {
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
    .select('active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.active) {
    return NextResponse.json({ error: 'Account inactive.' }, { status: 403 });
  }

  const [leadsRes, usersRes] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(10000),
    supabase.from('crm_users').select('*'),
  ]);
  if (leadsRes.error) {
    return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
  }

  const csv = leadsToCsv(
    (leadsRes.data as LeadRow[]) ?? [],
    (usersRes.data as CrmUserRow[]) ?? [],
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bin-suleman-leads-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}