'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function RegisterPage() {
  const router = useRouter();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [agencyName,  setAgencyName]  = useState('');
  const [agencyLogo,  setAgencyLogo]  = useState('');
  const [whatsapp,    setWhatsapp]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Şifrə ən azı 6 simvol olmalıdır');
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();

      // 1. Create Supabase Auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // 2. Save agency profile via API route (uses session cookie)
      if (data.user) {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agencyName, agencyLogo, whatsapp }),
        });
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-700 text-white text-3xl mb-4">
            ✈️
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">TourFlow</h1>
          <p className="text-slate-500 text-sm mt-1">Agentlik hesabı yaradın</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account info */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hesab məlumatları</p>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="agentlik@email.az"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Şifrə *</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ən azı 6 simvol"
                className={inputCls}
              />
            </div>
          </div>

          {/* Agency info */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Agentlik məlumatları</p>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Agentlik adı</label>
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="Sunrise Travel"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">WhatsApp nömrəsi</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+99450XXXXXXX"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Loqo URL-i (opsional)</label>
              <input
                type="url"
                value={agencyLogo}
                onChange={e => setAgencyLogo(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Qeydiyyat olunur...
              </span>
            ) : (
              'Qeydiyyatdan keç'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Artıq hesabınız var?{' '}
          <Link href="/login" className="text-blue-700 font-semibold hover:underline">
            Daxil olun
          </Link>
        </p>
      </div>
    </div>
  );
}
