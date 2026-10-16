'use client';

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { CrmUserRow } from '@/lib/types';

interface ProfileState {
  profile: CrmUserRow | null;
  loading: boolean;
  error: string | null;
}

/** Loads the signed-in user's crm_users row (RLS allows reading own row). */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({ profile: null, loading: true, error: null });

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      setState({ profile: null, loading: false, error: 'not-configured' });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) {
        setState({ profile: null, loading: false, error: 'not-signed-in' });
        return;
      }
      const { data, error } = await supabase
        .from('crm_users')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setState({ profile: null, loading: false, error: error.message });
      } else {
        setState({ profile: (data as CrmUserRow | null) ?? null, loading: false, error: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
