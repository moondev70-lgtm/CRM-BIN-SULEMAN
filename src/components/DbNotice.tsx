/**
 * Shown by the dashboard when the database tables are missing — i.e. the
 * migrations in supabase/migrations/ have not been applied yet. No secrets.
 */
export default function DbNotice({ detail }: { detail?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
          Database not ready
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy">
          CRM tables not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Supabase is configured, but the CRM schema is missing (or your account has no
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs"> crm_users</code> row).
          Apply the reviewed migrations in the CRM Supabase project SQL editor, in order:
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>0001_crm_users_and_helpers.sql</li>
          <li>0002_leads.sql</li>
          <li>0003_lead_activity.sql</li>
          <li>0004_assignment.sql</li>
          <li>0005_integration_tables.sql</li>
          <li>0006_audit_log.sql</li>
        </ol>
        {detail && (
          <p className="mt-3 break-words rounded-lg bg-slate-50 p-2 text-xs text-slate-500">{detail}</p>
        )}
      </div>
    </main>
  );
}