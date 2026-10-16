'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase/browser';
import SetupNotice from '@/components/SetupNotice';

type Phase = 'checking' | 'ready' | 'invalid-link' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      // PKCE flow: the email link lands with ?code=...
      const code = new URL(window.location.href).searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setPhase('invalid-link');
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setPhase(data.session ? 'ready' : 'invalid-link');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    const supabase = getBrowserClient();
    if (!supabase) return;
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPhase('done');
    setTimeout(() => router.replace('/dashboard'), 1500);
  };

  if (!isSupabaseConfigured()) return <SetupNotice />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">Choose a New Password</h1>
        </div>

        {phase === 'checking' && (
          <div className="card text-center text-sm text-slate-500">Verifying your reset link…</div>
        )}

        {phase === 'invalid-link' && (
          <div className="card text-center">
            <p className="text-sm text-slate-700">
              This reset link is invalid or has expired. Request a fresh one.
            </p>
            <a href="/forgot-password" className="btn-secondary mt-4">
              Request New Link
            </a>
          </div>
        )}

        {phase === 'done' && (
          <div className="card text-center">
            <p className="text-sm font-semibold text-emerald-700">
              Password updated — taking you to the dashboard…
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={onSubmit} className="card flex flex-col gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-slate-700">New password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-slate-700">Confirm password</span>
              <input
                type="password"
                required
                autoComplete="new-password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}