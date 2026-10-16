import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Refresh sessions on app routes and APIs, but never on static assets,
  // and never on the future webhook/cron endpoints (they authenticate with
  // signatures/secrets instead of cookies).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks/|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
