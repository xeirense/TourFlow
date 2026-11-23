'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

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

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="bg-[#1E293B] border border-white/5 rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/20 text-white text-3xl mb-4 border border-teal-500/30">
            ✈️
          </div>
          <h1 className="text-2xl font-extrabold text-white">TourFlow</h1>
          <p className="text-slate-400 text-sm mt-1">Agentlik panelinə giriş</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="agentlik@email.az"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Şifrə
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Daxil olunur...
              </span>
            ) : (
              'Daxil ol'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-slate-400">
            Hesabınız yoxdur?{' '}
            <Link href="/register" className="text-teal-400 font-semibold hover:underline">
              Qeydiyyatdan keçin
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/forgot-password" className="text-slate-500 hover:text-slate-300 transition-colors">
              Şifrəni unutmusunuz?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
