'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/Icon';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import LoadingOverlay from '@/app/_components/LoadingOverlay';
import { PLANS, type PlanTier } from '@/lib/planConfig';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function normalizeWa(value: string): string {
  // Strip everything except digits and leading +
  const digits = value.replace(/\D/g, '');
  if (!digits) return value;
  // If starts with 994 (10+ digits), prefix with +
  if (digits.startsWith('994') && digits.length >= 12) return `+${digits}`;
  // If starts with 0 (Azerbaijani local), replace leading 0 with +994
  if (digits.startsWith('0') && digits.length === 10) return `+994${digits.slice(1)}`;
  // Otherwise return cleaned digits
  return value;
}

function RegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl  = (searchParams.get('plan') ?? '') as PlanTier | '';
  const planInfo     = planFromUrl && planFromUrl in PLANS ? PLANS[planFromUrl as PlanTier] : null;

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

    if (!agencyName.trim()) {
      setError('Agentlik adı tələb olunur');
      setLoading(false);
      return;
    }
    if (!whatsapp.trim()) {
      setError('WhatsApp nömrəsi tələb olunur');
      setLoading(false);
      return;
    }
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
          body: JSON.stringify({ agencyName, whatsapp: normalizeWa(whatsapp) }),
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

  const inputCls = 'input h-11';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="card p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-ink">
            <span className="text-base font-bold text-white tracking-wide">TF</span>
          </div>
          <h1 className="text-xl font-semibold text-ink mt-4">TourFlow</h1>
          <p className="text-slate-500 text-sm mt-1">Agentlik hesabınızı yaradın</p>
        </div>

        {/* Selected plan badge */}
        {planInfo && (
          <div className="mb-5 flex items-center gap-2.5 bg-brand-50 border border-brand-200 rounded-lg px-3.5 py-2.5">
            <Icon name="check" className="w-4 h-4 text-brand-700 flex-shrink-0" strokeWidth={2.25} />
            <div>
              <p className="text-ink text-xs font-medium">{planInfo.name} planı seçildi</p>
              <p className="text-slate-500 text-xs">14 günlük pulsuz sınaq daxildir</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Account info */}
          <div className="space-y-3">
            <p className="section-title">
              Hesab məlumatları
            </p>
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
                placeholder="Ən azı 6 simvol"
                className={inputCls}
              />
            </div>
          </div>

          {/* Agency info */}
          <div className="space-y-3">
            <p className="section-title">
              Agentlik məlumatları
            </p>
            <div>
              <label className="label">
                Agentlik adı
              </label>
              <input
                type="text"
                required
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="Sunrise Travel"
                className={inputCls}
              />
            </div>
            <div>
              <label className="label">
                WhatsApp nömrəsi
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                onBlur={e => setWhatsapp(normalizeWa(e.target.value))}
                placeholder="+99450XXXXXXX"
                className={inputCls}
              />
              <p className="text-slate-500 text-xs mt-1.5">Müştərilər sizə bu nömrə ilə yazacaq</p>
            </div>
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
                Hesab yaradılır…
              </span>
            ) : (
              'Hesab yarat'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Artıq hesabınız var?{' '}
          <Link href="/login" className="text-brand-700 font-medium hover:underline">
            Daxil olun
          </Link>
        </p>
      </div>
    </div>
  );
}
