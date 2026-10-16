'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getBrowserClient } from '@/lib/supabase/browser';
import { formatDate } from '@/lib/format';
import type { CrmUserRow, UserRole } from '@/lib/types';

export default function TeamPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  const [users, setUsers] = useState<CrmUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('agent');

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase || !isAdmin) return;
    const { data, error: err } = await supabase
      .from('crm_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setUsers((data as CrmUserRow[]) ?? []);
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), display_name: displayName.trim(), role }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Invite failed.');
      } else {
        setNotice(`Invitation sent to ${email.trim()}.`);
        setEmail('');
        setDisplayName('');
        setRole('agent');
        void load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setBusy(false);
    }
  };

  const patchUser = async (
    userId: string,
    patch: { active?: boolean; assignment_enabled?: boolean; role?: UserRole },
  ) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { ok?: boolean; warning?: string; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Update failed.');
      } else {
        setNotice(body.warning ?? 'Team member updated.');
        void load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setBusy(false);
    }
  };

  if (profile && !isAdmin) {
    return (
      <div className="card border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800">
        Team management is restricted to administrators.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">Team</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Invite agents, control sign-in, and choose who receives round-robin leads.
        </p>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={onInvite} className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="mb-1 block font-bold text-slate-700">Email</span>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block flex-1 text-sm">
          <span className="mb-1 block font-bold text-slate-700">Display name</span>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Ali Khan"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold text-slate-700">Role</span>
          <select
            className="input sm:w-36"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Inviting…' : 'Send Invite'}
        </button>
      </form>

      <div className="card overflow-x-auto p-0">
        {users === null ? (
          <p className="p-5 text-sm text-slate-400">Loading team…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Member</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Active</th>
                <th className="hidden px-3 py-3 sm:table-cell">Round-robin</th>
                <th className="hidden px-3 py-3 lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.user_id} className={u.active ? '' : 'bg-slate-50 opacity-70'}>
                  <td className="px-5 py-3">
                    <p className="font-bold text-navy">{u.display_name || '—'}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="input py-1.5 text-xs"
                      value={u.role}
                      disabled={busy || u.user_id === profile?.user_id}
                      onChange={(e) => void patchUser(u.user_id, { role: e.target.value as UserRole })}
                    >
                      <option value="agent">agent</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 ${
                        u.active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      disabled={busy || u.user_id === profile?.user_id}
                      onClick={() => void patchUser(u.user_id, { active: !u.active })}
                      title={u.active ? 'Deactivate (blocks data access + sign-in)' : 'Reactivate'}
                    >
                      {u.active ? 'Active' : 'Deactivated'}
                    </button>
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 focus:ring-gold/30"
                      checked={u.assignment_enabled}
                      disabled={busy}
                      onChange={(e) =>
                        void patchUser(u.user_id, { assignment_enabled: e.target.checked })
                      }
                    />
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-500 lg:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Deactivating a member blocks their data access immediately (database-enforced) and bans
        their sign-in. There is no user deletion — history is preserved.
      </p>
    </div>
  );
}