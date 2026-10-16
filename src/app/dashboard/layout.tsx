import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import SetupNotice from '@/components/SetupNotice';
import DbNotice from '@/components/DbNotice';
import DashboardShell from '@/components/DashboardShell';
import type { CrmUserRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = getServerClient();
  if (!supabase) return <SetupNotice />;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('crm_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return <DbNotice detail={error.message} />;
  if (!data) return <DbNotice detail="No crm_users row for this account. Check migrations + admin grant." />;

  const profile = data as CrmUserRow;
  if (!profile.active) redirect('/login?reason=deactivated');

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}