import { NextResponse } from 'next/server';

/**
 * PLACEHOLDER — Facebook Lead Ads webhook (implemented in Phase 2).
 *
 * This route deliberately does NOT process anything yet and returns 501.
 * Phase 2 will implement:
 *   GET  → Meta hub.challenge verification against META_VERIFY_TOKEN
 *   POST → X-Hub-Signature-256 HMAC check (META_APP_SECRET), event
 *          dedupe via crm_webhook_events.event_key, Graph API lead
 *          retrieval, atomic insert + crm_assign_next_agent(), and
 *          sync-queue enqueue. See docs/meta-webhook.md (Phase 2).
 */
const stub = () =>
  NextResponse.json(
    {
      error: 'Not implemented yet.',
      detail:
        'Facebook Lead Ads ingestion arrives in Phase 2 and requires the Meta app, Page subscriptions, and META_* environment variables.',
    },
    { status: 501 },
  );

export async function GET() {
  return stub();
}

export async function POST() {
  return stub();
}