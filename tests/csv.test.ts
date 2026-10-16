import { describe, expect, it } from 'vitest';
import { escapeCsvValue, leadsToCsv, LEAD_CSV_HEADERS, toCsvRow } from '@/lib/csv';
import type { CrmUserRow, LeadRow } from '@/lib/types';

describe('escapeCsvValue', () => {
  it('passes plain values through', () => {
    expect(escapeCsvValue('Ahmed')).toBe('Ahmed');
    expect(escapeCsvValue(42)).toBe('42');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('maps null/undefined to empty cells', () => {
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
  });
});

describe('toCsvRow', () => {
  it('joins escaped cells', () => {
    expect(toCsvRow(['a', 'b,c', null])).toBe('a,"b,c",');
  });
});

const agent: CrmUserRow = {
  user_id: 'u-1',
  email: 'agent@example.com',
  display_name: 'Ali Khan',
  role: 'agent',
  active: true,
  assignment_enabled: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  deactivated_at: null,
};

const lead: LeadRow = {
  id: 'l-1',
  external_id: 'fb:123',
  source: 'facebook_form',
  name: 'Ahmed Raza',
  phone: '0300 9484188',
  phone_e164: '+923009484188',
  email: 'ahmed@example.com',
  form_answers: { 'Property Type': '5 Marla' },
  fb_page_id: 'page-1',
  fb_page_name: 'Bin Suleman',
  fb_form_id: 'form-1',
  fb_form_name: 'Prism 9 Inquiry',
  fb_campaign_id: 'camp-1',
  fb_ad_id: 'ad-1',
  meta_created_time: '2026-10-02T10:00:00Z',
  received_at: '2026-10-02T10:01:00Z',
  assigned_to: 'u-1',
  assignment_at: '2026-10-02T10:01:05Z',
  status: 'new',
  follow_up_at: null,
  consent_whatsapp: true,
  do_not_contact: false,
  created_at: '2026-10-02T10:01:00Z',
  updated_at: '2026-10-02T10:01:00Z',
};

describe('leadsToCsv', () => {
  it('produces a header row, BOM and the lead row', () => {
    const csv = leadsToCsv([lead], [agent]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(LEAD_CSV_HEADERS.join(','));
    expect(csv).toContain('Ahmed Raza');
    expect(csv).toContain('Ali Khan <agent@example.com>');
    expect(csv).toContain('"{""Property Type"":""5 Marla""}"');
  });

  it('handles a missing agent gracefully', () => {
    const csv = leadsToCsv([{ ...lead, assigned_to: null }], []);
    expect(csv).toContain(',new,');
  });
});