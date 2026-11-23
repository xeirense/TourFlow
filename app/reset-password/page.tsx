'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('Şifrə ən azı 6 simvol olmalıdır'); return; }
    if (password !== password2)  { setError('Şifrələr uyğun gəlmir'); return; }
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Şifrə yenilənmədi');
    }
    setLoading(false);
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl">✈️</span>
            <span className="text-white font-black text-xl">TourFlow</span>
          </div>
          <h1 className="text-white font-bold text-lg">Yeni Şifrə</h1>
          <p className="text-slate-500 text-sm mt-1">Yeni şifrənizi daxil edin</p>
        </div>

        <div className="bg-[#1E293B] border border-white/5 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Yeni Şifrə
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ən azı 6 simvol"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Şifrəni Təsdiqlə
              </label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Şifrəni yenidən daxil edin"
                required
                className={inputCls}
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white font-bold text-sm transition-colors"
            >
              {loading ? 'Yenilənir...' : 'Şifrəni Yenilə'}
            </button>

            <p className="text-center text-xs text-slate-500">
              <Link href="/login" className="text-teal-400 hover:text-teal-300 transition-colors">
                ← Daxil ol
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
