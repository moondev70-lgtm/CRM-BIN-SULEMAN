'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { SyncQueueRow, WebhookEventRow } from '@/lib/types';

function StatusPill({ label, state }: { label: string; state: 'ok' | 'pending' | 'bad' | 'muted' }) {
  const cls = {
    ok: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    bad: 'bg-red-100 text-red-700',
    muted: 'bg-slate-100 text-slate-500',
  }[state];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

export default function SyncPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';
  const [queue, setQueue] = useState<SyncQueueRow[]>([]);
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !isAdmin) return;
    (async () => {
      const [qRes, eRes] = await Promise.all([
        supabase.from('crm_sync_queue').select('*').order('updated_at', { ascending: false }).limit(50),
        supabase.from('crm_webhook_events').select('*').order('received_at', { ascending: false }).limit(20),
      ]);
      if (qRes.error) setError(qRes.error.message);
      setQueue((qRes.data as SyncQueueRow[]) ?? []);
      setEvents((eRes.data as WebhookEventRow[]) ?? []);
    })();
  }, [isAdmin]);

  if (profile && !isAdmin) {
    return (
      <div className="card border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800">
        Integration monitoring is restricted to administrators.
      </div>
    );
  }

  const failedJobs = queue.filter((q) => q.status === 'failed').length;
  const pendingJobs = queue.filter((q) => q.status !== 'succeeded' && q.status !== 'failed').length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">Integrations &amp; Sync</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Health of the Facebook webhook and Google Sheets synchronisation.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">
              Facebook Lead Ads
            </h2>
            <StatusPill label="not configured" state="muted" />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Endpoint reserved at{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/webhooks/meta</code>{' '}
            (Phase 2 — returns 501 until the Meta app + env vars exist).
          </p>
          <p className="mt-3 text-xs text-slate-400">Events stored: {events.length}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">
              Google Sheets
            </h2>
            <StatusPill label="not configured" state="muted" />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            The sync queue lives in the database; the worker route arrives in Phase 3. Leads never
            wait on Google — the CRM stores them first.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Pending: {pendingJobs} · Failed: {failedJobs}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <h2 className="px-5 pt-5 text-sm font-extrabold uppercase tracking-wider text-navy">
          Sync queue (latest 50)
        </h2>
        {queue.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Queue is empty — nothing to synchronise yet.</p>
        ) : (
          <table className="mt-3 min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Lead</th>
                <th className="px-3 py-3">Destination</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Attempts</th>
                <th className="hidden px-3 py-3 md:table-cell">Last error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map((j) => (
                <tr key={j.id}>
                  <td className="px-5 py-2 text-xs">{j.lead_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-xs">{j.destination}</td>
                  <td className="px-3 py-2 text-xs font-bold">{j.status}</td>
                  <td className="px-3 py-2 text-xs">{j.attempt_count}</td>
                  <td className="hidden max-w-xs truncate px-3 py-2 text-xs text-red-600 md:table-cell">
                    {j.last_error ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">WhatsApp</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manual wa.me links are available on every lead with a phone number. The official Business
          Platform API is intentionally not connected yet.
        </p>
      </div>
    </div>
  );
}