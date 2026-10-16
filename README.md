# Bin Suleman CRM

Internal, multi-user CRM for **Bin Suleman Real Estate & Builders** — Facebook
Lead Ads intake, round-robin agent assignment, Google Sheets synchronisation
and manual WhatsApp follow-up.

> **This application is fully isolated** from the public website
> (`moondev70-lgtm/Bin-Suleman-Real-Estate`), its Supabase project and its
> Vercel deployment. Nothing here touches the production website database.

## Status (Phase 1)

| Feature | State |
|---|---|
| App scaffold (Next.js 14, serverful — **not** static export) | ✅ |
| Login / logout / password reset (Supabase Auth, email = identifier) | ✅ code ready; needs a Supabase project |
| Roles: admin + sales agent, database-enforced (RLS) | ✅ schema + policies (migrations written, **not yet applied**) |
| Lead list: search, filters, pagination, status badges | ✅ |
| Lead detail: form answers, status flow, notes, follow-ups | ✅ |
| Admin: reassign, round-robin auto-assign RPC, do-not-contact | ✅ |
| Team management: invite, deactivate, assignment toggles | ✅ needs `SUPABASE_SERVICE_ROLE_KEY` |
| CSV export (RLS-scoped) | ✅ |
| WhatsApp manual wa.me links + honest click logging | ✅ |
| Audit log + status history | ✅ schema + triggers |
| Facebook webhook ingestion | 🔧 **stub only** (`/api/webhooks/meta` returns 501) — Phase 2 |
| Google Sheets sync worker | 🔧 **stub only** (`/api/cron/drain` returns 501) — Phase 3 |
| WhatsApp Business Cloud API | ⏸ intentionally not implemented (Phase 7 decision) |

**Do not claim the integrations work until the external accounts exist and the
end-to-end drills pass.** No credentials are bundled; `.env.example` lists
variable *names only*.

## Requirements

- Node.js 18.17+ (20 LTS recommended)
- npm (use `npm.cmd` on Windows PowerShell with a restricted execution policy)
- A **separate** Supabase project (create it yourself — never use the website's)

## Local setup

```powershell
cd "CRM Bin Suleman Real Estate"
npm.cmd install
copy .env.example .env.local      # then fill the NEXT_PUBLIC_ values
npm.cmd run dev                   # http://localhost:3000
```

Without `.env.local` the app renders a setup notice — that is expected.

### Environment variables (names only — see `.env.example`)

| Name | Where | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | public |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | 🔒 |
| `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN` | server only (Phase 2) | 🔒 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | server only (Phase 3) | 🔒 |
| `CRON_SECRET` | server only (Phase 3) | 🔒 |

## Database migrations (REVIEW BEFORE RUNNING)

Files in `supabase/migrations/` — **written for review, not executed anywhere**:

1. `0001_crm_users_and_helpers.sql` — users/roles, first-user-admin rule, helpers
2. `0002_leads.sql` — leads table, agent write-scope guard, RLS
3. `0003_lead_activity.sql` — status history + notes
4. `0004_assignment.sql` — round-robin pointer + `crm_assign_next_agent()`
5. `0005_integration_tables.sql` — webhook events, Sheets sync queue, config
6. `0006_audit_log.sql` — append-only audit trail + leads trigger

Apply **manually, in order, in the CRM project's SQL editor**, only after your
review. They are idempotent (safe to re-run). ⚠️ They have **not** been run.

### Supabase project settings (after applying migrations)

1. **Authentication → Providers → Email**: enabled (default).
2. **Authentication → URL Configuration**: set Site URL to your CRM origin
   (locally `http://localhost:3000`) and add it to Redirect URLs so password
   reset links land on `/reset-password`.
3. **Disable public sign-ups** (Authentication → Providers → Email → uncheck
   "Allow new users to sign up"). Team members are invited from the Team page.
4. **Create the first account** (Dashboard → Authentication → Add user →
   email + password). The `0001` trigger makes the **first** `crm_users` row an
   **admin** automatically. Sign in at `/login`.
5. Later promote/demote anyone from the Team page.

## Architecture notes

- **Source of truth is the database.** Google Sheets (Phase 3) is a one-way
  copy fed by `crm_sync_queue`.
- **Authorization is database-enforced.** Agents can only read leads assigned
  to them; a trigger blocks them from editing assignment/identity columns.
  Deactivation (`active=false`) instantly revokes data access — the UI guards
  are convenience only.
- **Round-robin** lives in Postgres (`crm_assign_next_agent`): a `FOR UPDATE`
  row lock serializes concurrent webhooks; the pointer advances exactly once
  per assignment; already-assigned leads are never reassigned automatically;
  no eligible agents → lead stays unassigned and visible to admins.
- **Secrets** never reach the browser: only `NEXT_PUBLIC_*` vars are inlined;
  everything else is read in route handlers (`/api/*`).
- **Hobby-plan note:** Vercel cron on Free is once/day — the sync design is
  event-driven (webhook → opportunistic drain → daily cron → manual retry).

## Scripts

```powershell
npm.cmd run dev        # develop
npm.cmd run build      # production build (also type-checks)
npm.cmd run start      # serve the build
npm.cmd run lint       # eslint (next/core-web-vitals)
npm.cmd run typecheck  # tsc --noEmit
npm.cmd test           # vitest unit tests (no database needed)
```

## Tests

`tests/` covers: phone normalization + wa.me links, CSV escaping/export,
bounded exponential backoff, Meta webhook signature verification, and the
lead-status transition rules. DB-level checks (RLS matrix, assignment
concurrency) are performed against the CRM Supabase project in Phase 6 QA.

## Repository

Local git only — **no remote configured**. Pushing/creating a GitHub repo
requires explicit owner approval.
