/**
 * Shown when NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are missing (e.g. before
 * .env.local exists). Purely informational — contains no secrets.
 */
export default function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <span className="inline-flex items-center rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-dark">
          Setup required
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy">
          Bin Suleman CRM is not configured yet
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The public Supabase environment variables are missing. Copy{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env.local</code> and fill in
          the <strong>NEXT_PUBLIC_</strong> values from your CRM Supabase project
          (Settings → API). Then restart the dev server.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          See README.md for the full setup checklist (migrations, auth settings, first admin).
        </p>
      </div>
    </main>
  );
}
