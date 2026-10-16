import { STATUS_META, statusLabel } from '@/lib/leads';
import type { LeadStatus } from '@/lib/types';

export default function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as LeadStatus];
  const cls = meta?.badgeClass ?? 'bg-slate-100 text-slate-600 border border-slate-200';
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}
    >
      {statusLabel(status)}
    </span>
  );
}