'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import LoadingOverlay from '@/app/_components/LoadingOverlay';

export default function RegisterPage() {
  const router = useRouter();
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [whatsapp,   setWhatsapp]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);

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
      const { data, error: authError } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.user) {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agencyName, whatsapp }),
        });
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
    return <LoadingOverlay message="Hesabınız hazırlanır..." />;
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4 py-8">
      <div className="bg-[#111827] border border-white/5 rounded-3xl shadow-2xl p-8 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-xl font-black text-white tracking-tighter">TF</span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-4">TourFlow</h1>
          <p className="text-slate-400 text-sm mt-1">Agentlik hesabınızı yaradın</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Account info */}
          <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Hesab məlumatları
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Email *
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
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Şifrə *
              </label>
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
          <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Agentlik məlumatları
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Agentlik adı
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="Sunrise Travel"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                WhatsApp nömrəsi
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+99450XXXXXXX"
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white font-bold text-sm transition-all active:scale-[.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Hesab yaradılır...
              </span>
            ) : (
              'Qeydiyyatdan keç →'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Artıq hesabınız var?{' '}
          <Link href="/login" className="text-teal-400 font-semibold hover:underline">
            Daxil olun
          </Link>
        </p>
      </div>
    </div>
  );
}
