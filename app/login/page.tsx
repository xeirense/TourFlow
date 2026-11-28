'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import LoadingOverlay from '@/app/_components/LoadingOverlay';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        setError('Email və ya şifrə yanlışdır');
        return;
      }
      setSuccess(true);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <LoadingOverlay message="Panel açılır…" />;
  }

  const inputCls = 'input h-11';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-ink">
            <span className="text-base font-bold text-white tracking-wide">TF</span>
          </div>
          <h1 className="text-xl font-semibold text-ink mt-4">TourFlow</h1>
          <p className="text-slate-500 text-sm mt-1">Agentlik panelinə giriş</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="agentlik@gmail.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label">
              Şifrə
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-lg btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                Yoxlanılır…
              </span>
            ) : (
              'Daxil ol'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-slate-500">
            Hesabınız yoxdur?{' '}
            <Link href="/register" className="text-brand-700 font-medium hover:underline">
              Qeydiyyatdan keçin
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/forgot-password" className="text-slate-500 hover:text-ink transition-colors">
              Şifrəni unutmusunuz?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
