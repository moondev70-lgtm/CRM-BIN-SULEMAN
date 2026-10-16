'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import StatusBadge from '@/components/StatusBadge';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useProfile } from '@/hooks/useProfile';
import { LEAD_STATUSES } from '@/lib/leads';
import { formatDate, todayIsoDate } from '@/lib/format';
import type { LeadRow } from '@/lib/types';

const PAGE_SIZE = 25;

type Scope = 'all' | 'mine' | 'unassigned' | 'followups';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All leads' },
  { value: 'mine', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'followups', label: 'Follow-ups due' },
];

export default function LeadsPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  const [rows, setRows] = useState<LeadRow[] | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase || !profile) return;
    let q = supabase.from('leads').select('*', { count: 'exact' });

    const term = query.trim();
    if (term) {
      const like = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;
      q = q.or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like},external_id.ilike.${like}`);
    }
    if (status) q = q.eq('status', status);
    if (scope === 'mine') q = q.eq('assigned_to', profile.user_id);
    if (scope === 'unassigned') q = q.is('assigned_to', null);
    if (scope === 'followups') {
      q = q.not('follow_up_at', 'is', null).lte('follow_up_at', todayIsoDate());
    }

    const from = page * PAGE_SIZE;
    const { data, count: total, error: err } = await q
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (err) {
      setError(err.message);
      setRows([]);
      setCount(0);
      return;
    }
    setError(null);
    setRows((data as LeadRow[]) ?? []);
    setCount(total ?? 0);
  }, [profile, query, status, scope, page, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [query, status, scope]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">Leads</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isAdmin
              ? 'All leads you are authorized to see.'
              : 'Only leads assigned to you are visible (enforced by the database).'}
          </p>
        </div>
        <a
          href="/api/export"
          className="btn-secondary"
          title="CSV of every lead you are authorized to see"
        >
          <Icon name="download" className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search name, phone, email, Facebook lead ID…"
            className="input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="input sm:w-48"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        {rows === null ? (
          <p className="p-5 text-sm text-slate-400">Loading leads…</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            No leads match. New Facebook leads will land here automatically once the webhook
            (Phase 2) is configured.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Lead</th>
                <th className="px-3 py-3">Status</th>
                {isAdmin && <th className="hidden px-3 py-3 md:table-cell">Assigned to</th>}
                <th className="hidden px-3 py-3 sm:table-cell">Follow-up</th>
                <th className="hidden px-3 py-3 lg:table-cell">Received</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/leads/${lead.id}`} className="block">
                      <p className="font-bold text-navy">{lead.name || '(no name)'}</p>
                      <p className="text-xs text-slate-500">
                        {lead.phone || lead.email || 'no contact info'}
                      </p>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  {isAdmin && (
                    <td className="hidden px-3 py-3 text-xs text-slate-600 md:table-cell">
                      {lead.assigned_to ? (
                        `${lead.assigned_to.slice(0, 8)}…`
                      ) : (
                        <span className="font-bold text-amber-600">Unassigned</span>
                      )}
                    </td>
                  )}
                  <td className="hidden px-3 py-3 text-xs text-slate-600 sm:table-cell">
                    {formatDate(lead.follow_up_at)}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-600 lg:table-cell">
                    {formatDate(lead.received_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/dashboard/leads/${lead.id}`} className="btn-secondary px-3 py-1.5">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page + 1} of {pages} · {count} leads
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn-secondary" onClick={() => setRefreshKey((k) => k + 1)}>
          Refresh
        </button>
      </div>
    </div>
  );
}