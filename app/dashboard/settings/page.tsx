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

        {/* ── Telegram bildirişləri ─────────────────────────────────────────── */}
        <TelegramSection />

        {/* ── Bildiriş Parametrləri ─────────────────────────────────────────── */}
        <NotificationSettingsSection />

        {/* ── Change password ───────────────────────────────────────────────── */}
        <ChangePasswordSection />
      </div>
    </div>
  );
}

function TelegramSection() {
  const [status,     setStatus]     = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [chatId,     setChatId]     = useState<number | null>(null);
  const [deepLink,   setDeepLink]   = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [testOk,     setTestOk]     = useState(false);
  const [tgError,    setTgError]    = useState('');

  function refreshStatus() {
    fetch('/api/admin/telegram-settings')
      .then(r => r.json())
      .then(d => {
        setStatus(d.connected ? 'connected' : 'disconnected');
        setChatId(d.chatId ?? null);
      })
      .catch(() => setStatus('disconnected'));
  }

  useEffect(() => { refreshStatus(); }, []);

  async function handleConnect() {
    setConnecting(true);
    setTgError('');
    try {
      const res  = await fetch('/api/telegram/connect', { method: 'POST' });
      const data = await res.json();
      if (data.deepLink) {
        setDeepLink(data.deepLink);
      } else {
        setTgError('Bot istifadəçi adı konfiqurasiya edilməyib (TELEGRAM_BOT_USERNAME)');
      }
    } catch {
      setTgError('Xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await fetch('/api/admin/telegram-settings', { method: 'DELETE' });
    setStatus('disconnected');
    setChatId(null);
    setDeepLink(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestOk(false);
    try {
      await fetch('/api/admin/telegram-test', { method: 'POST' });
      setTestOk(true);
      setTimeout(() => setTestOk(false), 3000);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Telegram Bildirişləri</p>
          <p className="text-xs text-slate-500 mt-0.5">Müştəri bildirişlərini Telegram-da alın</p>
        </div>
        <span className="text-2xl">📱</span>
      </div>

      {status === 'loading' && (
        <p className="text-xs text-slate-400">Yüklənir...</p>
      )}

      {status === 'connected' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span className="text-green-500 text-lg">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Telegram bağlıdır</p>
              {chatId && <p className="text-xs text-green-600 mt-0.5">Chat ID: {chatId}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex-1 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 disabled:opacity-60 transition-colors"
            >
              {testOk ? '✓ Göndərildi!' : testing ? 'Göndərilir...' : '🔔 Test Bildirişi Göndər'}
            </button>
            <button
              onClick={handleDisconnect}
              className="py-2.5 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              Ayır
            </button>
          </div>
        </div>
      )}

      {status === 'disconnected' && !deepLink && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Bağladıqdan sonra təklif baxışları, müştəri cavabları və xatırlatmalar Telegram-a göndəriləcək.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-60"
            style={{ background: connecting ? '#94a3b8' : '#229ED9' }}
          >
            {connecting ? 'Hazırlanır...' : '📱 Telegram-a Bağla'}
          </button>
        </div>
      )}

      {status === 'disconnected' && deepLink && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-blue-800">Telegram-da botu açın və &quot;Start&quot; düyməsinə basın:</p>
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 text-center rounded-lg text-white text-sm font-bold transition-colors"
              style={{ background: '#229ED9' }}
            >
              Telegram-da Aç
            </a>
            <p className="text-xs text-blue-500">Link 15 dəqiqəyə qədər keçərlidir</p>
          </div>
          <button
            onClick={() => { setDeepLink(null); refreshStatus(); }}
            className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Statusu yoxla
          </button>
        </div>
      )}

      {tgError && (
        <p className="text-xs text-red-600">{tgError}</p>
      )}
    </div>
  );
}

function NotificationSettingsSection() {
  const supabase = createSupabaseBrowserClient();

  interface NotifSettings {
    quietStart: number;
    quietEnd: number;
    highEnabled: boolean;
    normalEnabled: boolean;
    lowEnabled: boolean;
  }

  const [settings, setSettings] = useState<NotifSettings>({
    quietStart: 22, quietEnd: 9,
    highEnabled: true, normalEnabled: true, lowEnabled: true,
  });
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('agency_profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.notification_settings) {
        setSettings(s => ({ ...s, ...data.notification_settings }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('agency_profiles')
        .update({ notification_settings: settings })
        .eq('id', user.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bildiriş Parametrləri</p>

      {/* Quiet hours */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Sakit saat aralığı (Bakı vaxtı)</p>
        <p className="text-xs text-slate-400 mb-3">Bu aralıqda yalnız yüksək prioritetli bildirişlər göndərilir</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Başlanğıc</label>
            <select
              value={settings.quietStart}
              onChange={e => setSettings(s => ({ ...s, quietStart: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Bitmə</label>
            <select
              value={settings.quietEnd}
              onChange={e => setSettings(s => ({ ...s, quietEnd: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Priority toggles */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700">Bildiriş növləri</p>
        {([
          { key: 'highEnabled',   label: 'Yüksək prioritet',  desc: 'Birinci baxış, cavab, WhatsApp — həmişə göndərilir' },
          { key: 'normalEnabled', label: 'Normal prioritet',   desc: 'Təkrar baxışlar — saatda 1 dəfə göndərilir' },
          { key: 'lowEnabled',    label: 'Aşağı prioritet',    desc: 'Xatırlatmalar — sakit saatda göndərilmir' },
        ] as { key: keyof NotifSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-700 font-medium">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                settings[key] ? 'bg-teal-500' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings[key] ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-sm font-bold transition-colors"
      >
        {saved ? '✓ Saxlandı!' : saving ? 'Saxlanır...' : 'Parametrləri saxla'}
      </button>
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
