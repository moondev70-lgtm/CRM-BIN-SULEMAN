'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { CrmUserRow } from '@/lib/types';

interface ShellProps {
  profile: CrmUserRow;
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/dashboard/leads', label: 'Leads', icon: 'leads' },
  { href: '/dashboard/team', label: 'Team', icon: 'team', adminOnly: true },
  { href: '/dashboard/sync', label: 'Integrations', icon: 'sync', adminOnly: true },
];

export default function DashboardShell({ profile, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = profile.role === 'admin';

  const signOut = async () => {
    const supabase = getBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.replace('/login');
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide transition-colors ${
              active
                ? 'bg-gold/15 text-gold-light'
                : 'text-slate-300 hover:bg-navy-800 hover:text-white'
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="border-b border-navy-700 px-4 py-5">
        <p className="text-lg font-extrabold tracking-tight text-white">
          Bin Suleman <span className="text-gold-light">CRM</span>
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Real Estate &amp; Builders
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">{nav}</div>
      <div className="border-t border-navy-700 px-4 py-4">
        <p className="truncate text-sm font-semibold text-white" title={profile.email}>
          {profile.display_name || profile.email}
        </p>
        <p className="mt-0.5 inline-flex rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-light">
          {isAdmin ? 'Administrator' : 'Sales Agent'}
        </p>
        <button
          onClick={signOut}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-300 transition-colors hover:bg-navy-800 hover:text-white"
        >
          <Icon name="logout" className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-navy lg:block">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-navy">
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-navy">
              {NAV_ITEMS.find((i) =>
                i.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(i.href),
              )?.label ?? 'Dashboard'}
            </p>
          </div>
          <span className="hidden truncate text-xs font-semibold text-slate-500 sm:block">
            {profile.email}
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}