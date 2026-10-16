import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import SetupNotice from '@/components/SetupNotice';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = getServerClient();
  if (!supabase) {
    return <SetupNotice />;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? '/dashboard' : '/login');
}
