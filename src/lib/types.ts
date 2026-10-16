/** Shared row types mirroring the CRM database schema (migrations 0001–0006). */

export type UserRole = 'admin' | 'agent';

export interface CrmUserRow {
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  active: boolean;
  assignment_enabled: boolean;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'qualified'
  | 'appointment'
  | 'won'
  | 'lost'
  | 'unqualified';

export type LeadSource = 'facebook_form' | 'click_to_whatsapp' | 'manual';

export interface LeadRow {
  id: string;
  external_id: string | null;
  source: LeadSource;
  name: string | null;
  phone: string | null;
  phone_e164: string | null;
  email: string | null;
  form_answers: Record<string, string>;
  fb_page_id: string | null;
  fb_page_name: string | null;
  fb_form_id: string | null;
  fb_form_name: string | null;
  fb_campaign_id: string | null;
  fb_ad_id: string | null;
  meta_created_time: string | null;
  received_at: string;
  assigned_to: string | null;
  assignment_at: string | null;
  status: LeadStatus;
  follow_up_at: string | null;
  consent_whatsapp: boolean;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadNoteRow {
  id: string;
  lead_id: string;
  author: string | null;
  body: string;
  created_at: string;
}

export interface LeadStatusHistoryRow {
  id: string;
  lead_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface SyncQueueRow {
  id: string;
  lead_id: string;
  destination: string;
  operation: 'upsert' | 'delete';
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  attempt_count: number;
  last_error: string | null;
  next_attempt_at: string;
  last_success_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEventRow {
  id: string;
  event_key: string;
  source: string;
  status: 'received' | 'processing' | 'processed' | 'failed';
  lead_id: string | null;
  error: string | null;
  received_at: string;
  processed_at: string | null;
}
