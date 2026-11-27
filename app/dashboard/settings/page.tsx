'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { PLANS, getEffectivePlan, getTrialDaysLeft, type ProfilePlanData, type PlanTier } from '@/lib/planConfig';

export default function SettingsPage() {
  const router = useRouter();

  // ── Profile fields ──────────────────────────────────────────────────────────
  const [agencyName,   setAgencyName]   = useState('');
  const [agencyLogo,   setAgencyLogo]   = useState('');
  const [whatsapp,     setWhatsapp]     = useState('');
  const [managerName,  setManagerName]  = useState('');
  const [loading,      setLoading]      = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Plan data ───────────────────────────────────────────────────────────────
  const [planData, setPlanData] = useState<Partial<ProfilePlanData>>({});

  // Load current profile
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => {
        if (!r.ok) throw new Error('unauthenticated');
        return r.json();
      })
      .then(p => {
        if (p.agency_name)  setAgencyName(p.agency_name);
        if (p.agency_logo)  setAgencyLogo(p.agency_logo);
        if (p.whatsapp)     setWhatsapp(p.whatsapp);
        if (p.manager_name) setManagerName(p.manager_name);
        setPlanData({
          plan_tier:           p.plan_tier,
          subscription_status: p.subscription_status,
          trial_ends_at:       p.trial_ends_at,
          monthly_offers_used: p.monthly_offers_used,
          monthly_reset_at:    p.monthly_reset_at,
        });
      })
      .catch(() => {});
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (res.ok) {
        const { url } = await res.json();
        setAgencyLogo(url);
      } else {
        const { error: msg } = await res.json().catch(() => ({}));
        setError(msg ?? 'Şəkil yüklənmədi');
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyName, agencyLogo, whatsapp, managerName }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => { setSaved(false); router.push('/dashboard'); }, 1500);
    } else {
      setError('Yadda saxlamaq alınmadı');
    }

    setLoading(false);
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition';

  // ── Plan display ────────────────────────────────────────────────────────────
  const effectiveTier: PlanTier = planData.plan_tier
    ? getEffectivePlan(planData as ProfilePlanData)
    : 'growth';
  const planInfo      = PLANS[effectiveTier];
  const trialDaysLeft = getTrialDaysLeft(planData.trial_ends_at ?? null);
  const isTrialing    = planData.subscription_status === 'trialing' && trialDaysLeft > 0;
  const monthlyUsed   = planData.monthly_offers_used ?? 0;
  const monthlyLimit  = planInfo.limits.monthlyOfferLimit;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#0F172A] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xl">←</Link>
          <div className="flex-1">
            <h1 className="font-bold text-base">Profil Ayarları</h1>
            <p className="text-slate-500 text-xs">Agentlik məlumatlarını yeniləyin</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Current plan ─────────────────────────────────────────────────── */}
        {planData.plan_tier && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Cari Plan</p>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-black text-lg text-slate-900">{planInfo.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTrialing
                    ? `Pulsuz sınaq — ${trialDaysLeft} gün qalır`
                    : planData.subscription_status === 'active'
                    ? 'Aktiv abunə'
                    : planData.subscription_status === 'canceled'
                    ? 'Abunə dayandırılıb'
                    : planData.subscription_status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Bu ay istifadə</p>
                <p className="font-bold text-slate-800 text-sm">
                  {monthlyUsed} / {monthlyLimit == null ? '∞' : monthlyLimit} təklif
                </p>
              </div>
            </div>
            <Link
              href="/#qiymetler"
              className="mt-3 inline-block text-xs font-semibold text-teal-600 hover:underline"
            >
              Planı yüksəlt →
            </Link>
          </div>
        )}

        {/* ── Profile form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">

          {/* Agency name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
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

          {/* Manager name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Menecerin adı
            </label>
            <input
              type="text"
              value={managerName}
              onChange={e => setManagerName(e.target.value)}
              placeholder="Əli Əliyev"
              className={inputCls}
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
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

          {/* Logo upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Agentlik Loqosu
            </label>

            {agencyLogo && (
              <div className="mb-3 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Image
                  src={agencyLogo}
                  alt="Loqo"
                  width={48}
                  height={48}
                  className="rounded-lg object-contain"
                  unoptimized
                />
                <p className="flex-1 text-xs text-slate-400 truncate">{agencyLogo}</p>
                <button
                  type="button"
                  onClick={() => setAgencyLogo('')}
                  className="text-slate-400 hover:text-red-500 text-xs font-semibold transition-colors"
                >
                  Sil
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 text-slate-500 hover:text-teal-600 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {uploading ? '⏳ Yüklənir...' : '📁 Şəkil seç (maks. 5MB)'}
            </button>

            <input
              type="url"
              value={agencyLogo}
              onChange={e => setAgencyLogo(e.target.value)}
              placeholder="ya URL yapışdırın: https://..."
              className={`${inputCls} mt-2 text-xs`}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white font-bold text-sm transition-colors"
          >
            {saved ? '✓ Yadda saxlandı!' : loading ? 'Yüklənir...' : 'Yadda saxla'}
          </button>
        </form>

        {/* ── Change password ───────────────────────────────────────────────── */}
        <ChangePasswordSection />
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [error,           setError]           = useState('');

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Şifrə ən azı 6 simvol olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifrələr uyğun gəlmir');
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('Xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition';

  return (
    <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Şifrəni dəyiş</p>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Yeni şifrə
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Ən azı 6 simvol"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Şifrəni təsdiqlə
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Yenidən daxil edin"
          className={inputCls}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          ✓ Şifrə uğurla dəyişdirildi
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm transition-colors"
      >
        {loading ? 'Yüklənir...' : 'Şifrəni yenilə'}
      </button>
    </form>
  );
}
