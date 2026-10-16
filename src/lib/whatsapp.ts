/**
 * WhatsApp helpers — MANUAL wa.me workflow only (Phase 1).
 *
 * Opening a wa.me link only opens a chat window on the AGENT's device.
 * It is never evidence of delivery or reading, and we never message a lead
 * with do_not_contact set. Official Cloud API integration is Phase 7.
 */

/**
 * Normalize a Pakistani (or international) phone number to E.164.
 * Returns null when the input clearly isn't a phone number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (!hasPlus) {
    if (digits.startsWith('00')) {
      // International prefix: 0092...
      digits = digits.slice(2);
    } else if (digits.startsWith('92') && digits.length >= 12) {
      // Already in country-code form: 923009484188
      // (leave as-is)
    } else if (digits.startsWith('0') && digits.length >= 10) {
      // Pakistani local format: 0300 9484188 → 923009484188
      digits = '92' + digits.slice(1);
    } else if (digits.startsWith('3') && digits.length === 10) {
      // Missing leading zero: 3009484188 → 923009484188
      digits = '92' + digits;
    }
  }

  if (digits.length < 7 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Build a wa.me deep link (E.164 without '+', optional prefilled text). */
export function waLink(phoneE164: string, message?: string): string {
  const digits = phoneE164.replace(/^\+/, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Default new-inquiry prefill (Phase 2: admin-editable via crm_integration_config). */
export function buildInquiryMessage(leadName?: string | null): string {
  const name = (leadName ?? '').trim() || 'there';
  return (
    `Assalam-o-Alaikum ${name}, thank you for your interest in ` +
    `Bin Suleman Real Estate & Builders (DHA Phase 9 Prism, Lahore). ` +
    `How may we assist you today?`
  );
}
