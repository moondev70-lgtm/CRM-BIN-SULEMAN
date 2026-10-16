import { NextResponse, type NextRequest } from 'next/server';

/**
 * PLACEHOLDER — sync-queue drain worker (implemented in Phase 3).
 *
 * Will be invoked by (a) the daily Vercel cron (Hobby: once/day),
 * (b) opportunistic fire-and-forget calls after enqueue, and
 * (c) the admin "Retry now" button. Protected by CRON_SECRET.
 * Phase 3 claims due jobs with FOR UPDATE SKIP LOCKED and writes to
 * Google Sheets via the service account.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  return NextResponse.json(
    {
      error: 'Not implemented yet.',
      detail: 'The Sheets sync worker arrives in Phase 3 (requires the Google service account).',
    },
    { status: 501 },
  );
}