'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useProfile } from '@/hooks/useProfile';
import { allowedTransitions, statusLabel } from '@/lib/leads';
import { formatDateTime } from '@/lib/format';
import { buildInquiryMessage, normalizePhone, waLink } from '@/lib/whatsapp';
import type {
  CrmUserRow,
  LeadNoteRow,
  LeadRow,
  LeadStatus,
  LeadStatusHistoryRow,
} from '@/lib/types';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  const [lead, setLead] = useState<LeadRow | null>(null);
  const [notes, setNotes] = useState<LeadNoteRow[]>([]);
  const [history, setHistory] = useState<LeadStatusHistoryRow[]>([]);
  const [agents, setAgents] = useState<CrmUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteBody, setNoteBody] = useState('');

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    if (!supabase || !id) return;
    const [leadRes, notesRes, histRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).maybeSingle(),
      supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase
        .from('lead_status_history')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
    ]);
    if (leadRes.error) {
      setError(leadRes.error.message);
      return;
    }
    if (!leadRes.data) {
      setError('Lead not found (or not visible to your account).');
      return;
    }
    setError(null);
    setLead(leadRes.data as LeadRow);
    setNotes((notesRes.data as LeadNoteRow[]) ?? []);
    setHistory((histRes.data as LeadStatusHistoryRow[]) ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase || !isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('crm_users')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });
      setAgents((data as CrmUserRow[]) ?? []);
    })();
  }, [isAdmin]);

  const patchLead = (patch: Partial<LeadRow>) => {
    setLead((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const onStatusChange = async (to: LeadStatus) => {
    if (!lead || busy) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setNotice(null);
    const from = lead.status;
    const { error: updErr } = await supabase
      .from('leads')
      .update({ status: to, updated_at: new Date().toISOString() })
      .eq('id', lead.id);
    if (updErr) {
      setNotice(`Status update failed: ${updErr.message}`);
      setBusy(false);
      return;
    }
    patchLead({ status: to });
    // Best-effort history entry (the DB audit trigger also records every change).
    const { error: histErr } = await supabase
      .from('lead_status_history')
      .insert({ lead_id: lead.id, from_status: from, to_status: to, changed_by: profile?.user_id ?? null });
    if (histErr) console.warn('history insert failed:', histErr.message);
    void load();
    setBusy(false);
  };

  const onFollowUpChange = async (value: string) => {
    if (!lead || busy) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const followUp = value === '' ? null : value;
    const { error: updErr } = await supabase
      .from('leads')
      .update({ follow_up_at: followUp })
      .eq('id', lead.id);
    setBusy(false);
    if (updErr) {
      setNotice(`Follow-up update failed: ${updErr.message}`);
      return;
    }
    patchLead({ follow_up_at: followUp });
    setNotice('Follow-up date saved.');
  };

  const onAddNote = async () => {
    if (!lead || !profile || !noteBody.trim() || busy) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error: insErr } = await supabase
      .from('lead_notes')
      .insert({ lead_id: lead.id, author: profile.user_id, body: noteBody.trim() });
    setBusy(false);
    if (insErr) {
      setNotice(`Note failed: ${insErr.message}`);
      return;
    }
    setNoteBody('');
    void load();
  };

  const onAssign = async (userId: string) => {
    if (!lead || !isAdmin || busy) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setNotice(null);
    const assignedTo = userId === '' ? null : userId;
    const { error: updErr } = await supabase
      .from('leads')
      .update({ assigned_to: assignedTo, assignment_at: assignedTo ? new Date().toISOString() : null })
      .eq('id', lead.id);
    setBusy(false);
    if (updErr) {
      setNotice(`Reassignment failed: ${updErr.message}`);
      return;
    }
    patchLead({ assigned_to: assignedTo });
    void load();
  };

  const onAutoAssign = async () => {
    if (!lead || !isAdmin || busy) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setNotice(null);
    const { data, error: rpcErr } = await supabase.rpc('crm_assign_next_agent', {
      p_lead_id: lead.id,
    });
    setBusy(false);
    if (rpcErr) {
      setNotice(`Auto-assign failed: ${rpcErr.message}`);
      return;
    }
    setNotice(
      data
        ? 'Lead auto-assigned via the round-robin engine.'
        : 'No eligible agents — enable assignment for at least one active team member.',
    );
    void load();
  };

  const onToggleDnc = async () => {
    if (!lead || !isAdmin || busy) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error: updErr } = await supabase
      .from('leads')
      .update({ do_not_contact: !lead.do_not_contact })
      .eq('id', lead.id);
    setBusy(false);
    if (updErr) {
      setNotice(`Update failed: ${updErr.message}`);
      return;
    }
    patchLead({ do_not_contact: !lead.do_not_contact });
  };

  const waPhone = lead ? normalizePhone(lead.phone_e164 ?? lead.phone) : null;
  const waHref = lead && waPhone ? waLink(waPhone, buildInquiryMessage(lead.name)) : null;

  const onWaClick = () => {
    // Best-effort audit: a clicked link is NOT proof of delivery or reading.
    const supabase = getBrowserClient();
    if (!supabase || !lead || !profile) return;
    void supabase.from('crm_audit_log').insert({
      actor: profile.user_id,
      action: 'whatsapp_link_clicked',
      entity_type: 'lead',
      entity_id: lead.id,
      after: { note: 'agent opened wa.me link; delivery not implied' },
    });
  };

  const transitions = lead ? allowedTransitions(lead.status) : [];

  if (error) {
    return (
      <div className="card border-amber-200 bg-amber-50">
        <p className="text-sm font-semibold text-amber-800">{error}</p>
        <Link href="/dashboard/leads" className="btn-secondary mt-4 inline-flex">
          ← Back to leads
        </Link>
      </div>
    );
  }

  if (!lead) {
    return <p className="text-sm text-slate-400">Loading lead…</p>;
  }

  const answers = Object.entries(lead.form_answers ?? {});

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/leads" className="text-xs font-bold text-gold-dark hover:underline">
            ← Back to leads
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy">
            {lead.name || '(no name provided)'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lead.source.replace('_', ' ')}
            </span>
            {lead.do_not_contact && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700">
                Do not contact
              </span>
            )}
          </div>
        </div>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWaClick}
            className="btn-whatsapp py-2.5"
            title="Opens WhatsApp with a prefilled, editable message. Delivery is NOT guaranteed."
          >
            💬 WhatsApp
          </a>
        ) : (
          <span
            className="btn-whatsapp cursor-not-allowed py-2.5 opacity-50"
            title="No usable phone number"
          >
            💬 WhatsApp
          </span>
        )}
      </div>

      {notice && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Contact details</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</dt>
                <dd className="text-slate-800">{lead.phone || '—'}</dd>
                {lead.phone_e164 && lead.phone_e164 !== lead.phone && (
                  <dd className="text-xs text-slate-500">E.164: {lead.phone_e164}</dd>
                )}
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</dt>
                <dd className="break-all text-slate-800">{lead.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Received</dt>
                <dd className="text-slate-800">{formatDateTime(lead.received_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Meta creation time
                </dt>
                <dd className="text-slate-800">{formatDateTime(lead.meta_created_time)}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Form answers</h2>
            {answers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No form answers stored (arrives with Facebook leads in Phase 2).
              </p>
            ) : (
              <dl className="mt-3 flex flex-col divide-y divide-slate-100">
                {answers.map(([k, v]) => (
                  <div key={k} className="py-2">
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                    <dd className="text-sm text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {lead.external_id && (
              <p className="mt-3 text-xs text-slate-400">Facebook lead ID: {lead.external_id}</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Notes</h2>
            <div className="mt-3 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add a note…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onAddNote();
                }}
              />
              <button
                className="btn-primary"
                disabled={busy || !noteBody.trim()}
                onClick={() => void onAddNote()}
              >
                Add
              </button>
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-slate-100">
              {notes.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="text-sm text-slate-800">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
                </li>
              ))}
              {notes.length === 0 && <li className="py-3 text-sm text-slate-400">No notes yet.</li>}
            </ul>
          </div>

          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Activity</h2>
            <ul className="mt-3 flex flex-col divide-y divide-slate-100">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-sm text-slate-700">
                  Status: {statusLabel(h.from_status ?? '—')} →{' '}
                  <strong>{statusLabel(h.to_status)}</strong>
                  <span className="text-xs text-slate-400"> · {formatDateTime(h.created_at)}</span>
                </li>
              ))}
              {history.length === 0 && (
                <li className="py-2 text-sm text-slate-400">No status changes recorded yet.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-5">
          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Status</h2>
            <select
              className="input mt-3"
              value={lead.status}
              disabled={busy}
              onChange={(e) => void onStatusChange(e.target.value as LeadStatus)}
            >
              <option value={lead.status}>{statusLabel(lead.status)} (current)</option>
              {transitions.map((t) => (
                <option key={t} value={t}>
                  → {statusLabel(t)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-400">
              Allowed flow keeps the pipeline honest — reopen lost/unqualified leads first.
            </p>
          </div>

          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Follow-up</h2>
            <input
              type="date"
              className="input mt-3"
              value={lead.follow_up_at ?? ''}
              disabled={busy}
              onChange={(e) => void onFollowUpChange(e.target.value)}
            />
          </div>

          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Assignment</h2>
            {isAdmin ? (
              <>
                <select
                  className="input mt-3"
                  value={lead.assigned_to ?? ''}
                  disabled={busy}
                  onChange={(e) => void onAssign(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.display_name || a.email}
                    </option>
                  ))}
                </select>
                {!lead.assigned_to && (
                  <button
                    className="btn-secondary mt-2 w-full"
                    disabled={busy}
                    onClick={() => void onAutoAssign()}
                  >
                    ⚙ Auto-assign (round-robin)
                  </button>
                )}
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 focus:ring-gold/30"
                    checked={lead.do_not_contact}
                    disabled={busy}
                    onChange={() => void onToggleDnc()}
                  />
                  Do not contact (suppresses WhatsApp)
                </label>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                {lead.assigned_to === profile?.user_id
                  ? 'Assigned to you.'
                  : 'Assigned to another agent.'}
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-navy">Source</h2>
            <dl className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
              <div>Page: {lead.fb_page_name || lead.fb_page_id || '—'}</div>
              <div>Form: {lead.fb_form_name || lead.fb_form_id || '—'}</div>
              <div>Campaign: {lead.fb_campaign_id || '—'}</div>
              <div>Ad: {lead.fb_ad_id || '—'}</div>
            </dl>
            {waPhone && <p className="mt-2 text-xs text-slate-400">WhatsApp target: {waPhone}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}