import type { CrmUserRow, LeadRow } from './types';

/** Escape a single CSV cell (RFC 4180-style quoting). */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(',');
}

/** Master spreadsheet column order (see project spec §7). */
export const LEAD_CSV_HEADERS = [
  'Lead ID',
  'Facebook Lead ID',
  'Created At',
  'Customer Name',
  'Phone',
  'Phone (E.164)',
  'Email',
  'Form Answers',
  'Facebook Page',
  'Form',
  'Campaign',
  'Ad',
  'Assigned Agent',
  'Status',
  'Follow-up Date',
  'Last Updated',
] as const;

export function leadToCsvRow(
  lead: LeadRow,
  usersById: Map<string, CrmUserRow>,
): string {
  const agent = lead.assigned_to ? usersById.get(lead.assigned_to) : undefined;
  return toCsvRow([
    lead.id,
    lead.external_id ?? '',
    lead.received_at,
    lead.name ?? '',
    lead.phone ?? '',
    lead.phone_e164 ?? '',
    lead.email ?? '',
    lead.form_answers && Object.keys(lead.form_answers).length
      ? JSON.stringify(lead.form_answers)
      : '',
    lead.fb_page_name ?? lead.fb_page_id ?? '',
    lead.fb_form_name ?? lead.fb_form_id ?? '',
    lead.fb_campaign_id ?? '',
    lead.fb_ad_id ?? '',
    agent ? `${agent.display_name || agent.email} <${agent.email}>` : '',
    lead.status,
    lead.follow_up_at ?? '',
    lead.updated_at,
  ]);
}

export function leadsToCsv(
  leads: LeadRow[],
  users: CrmUserRow[],
): string {
  const usersById = new Map(users.map((u) => [u.user_id, u]));
  const lines = [LEAD_CSV_HEADERS.join(','), ...leads.map((l) => leadToCsvRow(l, usersById))];
  // BOM so Excel opens UTF-8 names correctly.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
