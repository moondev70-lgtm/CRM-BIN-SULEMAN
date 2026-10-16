'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase/browser';
import SetupNotice from '@/components/SetupNotice';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError('Invalid email or password.');
      return;
    }
    const next = searchParams.get('next');
    router.replace(next && next.startsWith('/dashboard') ? next : '/dashboard');
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center rounded-full bg-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-dark">
          Restricted
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy">Bin Suleman CRM</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with your team account to manage leads.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card flex flex-col gap-4">
        <label className="block text-sm">
          <span className="mb-1 block font-bold text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-bold text-slate-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
        <div className="flex items-center justify-between text-xs">
          <Link href="/forgot-password" className="font-semibold text-gold-dark hover:underline">
            Forgot password?
          </Link>
          <span className="text-slate-400">Admins &amp; sales agents only</span>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
