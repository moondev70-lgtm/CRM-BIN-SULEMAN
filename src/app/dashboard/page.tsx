'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useProfile } from '@/hooks/useProfile';
import { LEAD_STATUSES, isTerminalStatus } from '@/lib/leads';
import { formatDate, todayIsoDate } from '@/lib/format';
import type { LeadRow } from '@/lib/types';

interface Stats {
  total: number;
  unassigned: number;
  followUpsDue: number;
  myLeads: number;
  byStatus: Record<string, number>;
}

export default function DashboardHome() {
  const { profile } = useProfile();
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLeads([]);
      } else {
        setLeads((data as LeadRow[]) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: Stats = useMemo(() => {
    const rows = leads ?? [];
    const today = todayIsoDate();
    const byStatus: Record<string, number> = {};
    for (const s of LEAD_STATUSES) byStatus[s] = 0;
    let unassigned = 0;
    let followUpsDue = 0;
    let myLeads = 0;
    for (const lead of rows) {
      byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
      if (!lead.assigned_to) unassigned += 1;
      if (lead.follow_up_at && lead.follow_up_at <= today && !isTerminalStatus(lead.status)) {
        followUpsDue += 1;
      }
      if (profile && lead.assigned_to === profile.user_id) myLeads += 1;
    }
    return { total: rows.length, unassigned, followUpsDue, myLeads, byStatus };
  }, [leads, profile]);

  const recent = (leads ?? []).slice(0, 5);
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin ? 'All-teams overview.' : 'Your assigned leads at a glance.'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Could not load leads: {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={isAdmin ? 'Total leads' : 'My leads'}
          value={isAdmin ? stats.total : stats.myLeads}
          hint={isAdmin ? 'All sources' : 'Assigned to you'}
        />
        {isAdmin && (
          <StatCard
            label="Unassigned"
            value={stats.unassigned}
            hint="Need an agent"
            accent={stats.unassigned > 0}
          />
        )}
        <StatCard label="Follow-ups due" value={stats.followUpsDue} hint="Today or overdue" accent={stats.followUpsDue > 0} />
        <StatCard
          label="Open pipeline"
          value={LEAD_STATUSES.filter((s) => !isTerminalStatus(s)).reduce(
            (acc, s) => acc + (stats.byStatus[s] ?? 0),
            0,
          )}
          hint="Not won/lost yet"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {LEAD_STATUSES.map((s) => (
          <div key={s} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
            <p className="text-lg font-extrabold text-navy">{stats.byStatus[s] ?? 0}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Recent leads</h2>
          <Link href="/dashboard/leads" className="text-xs font-bold text-gold-dark hover:underline">
            View all →
          </Link>
        </div>
        {leads === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-500">
            No leads yet. Facebook Lead Ads will appear here once the webhook (Phase 2) is connected —
            or a future manual-entry form adds them.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy">{lead.name || '(no name)'}</p>
                    <p className="truncate text-xs text-slate-500">
                      {lead.phone || lead.email || 'no contact'} · {formatDate(lead.received_at)}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}