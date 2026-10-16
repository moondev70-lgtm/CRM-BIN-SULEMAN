import type { LeadStatus } from './types';

/** Canonical status list (must match the CHECK constraint in 0002_leads.sql). */
export const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'follow_up',
  'qualified',
  'appointment',
  'won',
  'lost',
  'unqualified',
];

export const TERMINAL_STATUSES: LeadStatus[] = ['won', 'lost', 'unqualified'];

interface StatusMeta {
  label: string;
  badgeClass: string;
}

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  new: { label: 'New', badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200' },
  contacted: { label: 'Contacted', badgeClass: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  follow_up: { label: 'Follow-up', badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200' },
  qualified: { label: 'Qualified', badgeClass: 'bg-violet-100 text-violet-700 border border-violet-200' },
  appointment: { label: 'Appointment', badgeClass: 'bg-cyan-100 text-cyan-700 border border-cyan-200' },
  won: { label: 'Won', badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  lost: { label: 'Lost', badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200' },
  unqualified: { label: 'Unqualified', badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

/**
 * Allowed status flow. Anything not listed is rejected client-side
 * (the database allows any valid status value; this is UX guidance).
 */
export const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'unqualified'],
  contacted: ['follow_up', 'qualified', 'unqualified', 'lost'],
  follow_up: ['contacted', 'qualified', 'appointment', 'lost'],
  qualified: ['appointment', 'contacted', 'lost'],
  appointment: ['won', 'lost', 'contacted'],
  won: [],
  lost: ['new'],
  unqualified: ['new'],
};

export function isTerminalStatus(status: LeadStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedTransitions(from: LeadStatus): LeadStatus[] {
  return STATUS_TRANSITIONS[from] ?? [];
}

export function statusLabel(status: string): string {
  return STATUS_META[status as LeadStatus]?.label ?? status;
}
