'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase/browser';
import SetupNotice from '@/components/SetupNotice';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  if (!isSupabaseConfigured()) return <SetupNotice />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;ll email you a secure reset link.
          </p>
        </div>
        {sent ? (
          <div className="card text-center">
            <p className="text-sm text-slate-700">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              Open it on this device, then choose a new password.
            </p>
            <Link href="/login" className="btn-secondary mt-4">
              Back to Sign In
            </Link>
          </div>
        ) : (
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
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
            <Link href="/login" className="text-center text-xs font-semibold text-gold-dark hover:underline">
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}