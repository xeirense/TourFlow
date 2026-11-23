'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Xəta baş verdi');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl">✈️</span>
            <span className="text-white font-black text-xl">TourFlow</span>
          </div>
          <h1 className="text-white font-bold text-lg">Şifrəni Sıfırla</h1>
          <p className="text-slate-500 text-sm mt-1">Email ünvanınızı daxil edin</p>
        </div>

        <div className="bg-[#1E293B] border border-white/5 rounded-2xl p-6">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="text-4xl">📧</div>
              <p className="text-white font-bold">Email göndərildi!</p>
              <p className="text-slate-400 text-sm">
                <strong className="text-white">{email}</strong> ünvanına şifrə sıfırlama linki göndərildi.
                Spam qutunuzu da yoxlayın.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-teal-400 text-sm hover:text-teal-300 transition-colors"
              >
                ← Daxil olma səhifəsinə qayıt
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Email ünvanı
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@agentlik.az"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
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
                {loading ? 'Göndərilir...' : 'Sıfırlama Linki Göndər'}
              </button>

              <p className="text-center text-xs text-slate-500">
                <Link href="/login" className="text-teal-400 hover:text-teal-300 transition-colors">
                  ← Daxil ol
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
