'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/app/components/Icon';

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ink mb-4">
            <span className="text-sm font-bold text-white tracking-wide">TF</span>
          </div>
          <h1 className="text-ink font-semibold text-xl">Şifrəni Sıfırla</h1>
          <p className="text-slate-500 text-sm mt-1">Email ünvanınızı daxil edin</p>
        </div>

        <div className="card p-6 sm:p-8">
          {sent ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center mx-auto"><Icon name="mail" className="w-5 h-5" /></div>
              <p className="text-ink font-semibold">Email göndərildi!</p>
              <p className="text-slate-500 text-sm">
                <strong className="text-ink font-medium">{email}</strong> ünvanına şifrə sıfırlama linki göndərildi.
                Spam qutunuzu da yoxlayın.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-brand-700 text-sm hover:underline"
              >
                Girişə qayıt
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  Email ünvanı
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@agentlik.az"
                  required
                  className="input h-11"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-lg btn-primary w-full"
              >
                {loading ? 'Göndərilir…' : 'Sıfırlama linki göndər'}
              </button>

              <p className="text-center text-xs text-slate-500">
                <Link href="/login" className="text-brand-700 hover:underline">
                  Girişə qayıt
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
