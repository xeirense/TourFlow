'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { PLANS, getEffectivePlan, getTrialDaysLeft, type ProfilePlanData, type PlanTier } from '@/lib/planConfig';
import Icon from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';

// ─── Layout helpers ───────────────────────────────────────────────────────────
function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-4 md:gap-8 py-8 border-t border-slate-200 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
        on ? 'bg-brand-600' : 'bg-slate-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        on ? 'translate-x-[18px]' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

function Notice({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <p className={`text-xs inline-flex items-center gap-1.5 ${kind === 'error' ? 'text-red-600' : 'text-brand-700'}`}>
      <Icon name={kind === 'error' ? 'alert' : 'check'} className="w-3.5 h-3.5" />
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError('Yadda saxlamaq alınmadı');
    }

    setLoading(false);
  }

  // ── Plan display ────────────────────────────────────────────────────────────
  const effectiveTier: PlanTier = planData.plan_tier
    ? getEffectivePlan(planData as ProfilePlanData)
    : 'growth';
  const planInfo      = PLANS[effectiveTier];
  const trialDaysLeft = getTrialDaysLeft(planData.trial_ends_at ?? null);
  const isTrialing    = planData.subscription_status === 'trialing' && trialDaysLeft > 0;
  const monthlyUsed   = planData.monthly_offers_used ?? 0;
  const monthlyLimit  = planInfo.limits.monthlyOfferLimit;
  const usagePct      = monthlyLimit ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageTitle title="Parametrlər" subtitle="Agentlik profili, plan və bildirişlər" />

      <div className="card p-6 sm:p-8">

        {/* ── Plan ─────────────────────────────────────────────────────────── */}
        {planData.plan_tier && (
          <SettingsRow title="Plan" description="Cari abunəniz və bu ayın istifadəsi.">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-lg font-semibold text-ink tracking-tight">{planInfo.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isTrialing
                      ? `Pulsuz sınaq — ${trialDaysLeft} gün qalıb`
                      : planData.subscription_status === 'active'
                      ? 'Aktiv abunə'
                      : planData.subscription_status === 'canceled'
                      ? 'Abunə dayandırılıb'
                      : planData.subscription_status}
                  </p>
                </div>
                <Link href="/dashboard/plan" className="btn btn-sm btn-secondary">
                  Planı dəyiş
                </Link>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Bu ay göndərilən təkliflər</span>
                  <span className="text-ink font-medium">
                    {monthlyUsed} / {monthlyLimit == null ? 'limitsiz' : monthlyLimit}
                  </span>
                </div>
                {monthlyLimit != null && (
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full" style={{ width: `${usagePct}%` }} />
                  </div>
                )}
              </div>
            </div>
          </SettingsRow>
        )}

        {/* ── Agency profile ───────────────────────────────────────────────── */}
        <SettingsRow
          title="Agentlik profili"
          description="Bu məlumatlar müştərinin gördüyü təklif səhifəsində göstərilir."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Agentlik adı</label>
                <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                  placeholder="Sunrise Travel" className="input" />
              </div>
              <div>
                <label className="label">Menecerin adı</label>
                <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)}
                  placeholder="Əli Əliyev" className="input" />
              </div>
            </div>

            <div>
              <label className="label">WhatsApp nömrəsi</label>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="+994 50 000 00 00" className="input sm:max-w-xs" />
            </div>

            <div>
              <label className="label">Loqo</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {agencyLogo ? (
                    <Image src={agencyLogo} alt="Loqo" width={56} height={56} className="object-contain w-full h-full" unoptimized />
                  ) : (
                    <Icon name="image" className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-sm btn-secondary">
                  <Icon name="upload" className="w-3.5 h-3.5" />
                  {uploading ? 'Yüklənir…' : agencyLogo ? 'Dəyiş' : 'Yüklə'}
                </button>
                {agencyLogo && (
                  <button type="button" onClick={() => setAgencyLogo('')} className="btn btn-sm btn-ghost">
                    Sil
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">PNG və ya JPG, maksimum 5 MB.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading || uploading} className="btn btn-md btn-primary">
                {loading ? 'Saxlanılır…' : 'Yadda saxla'}
              </button>
              {saved && <Notice kind="success">Yadda saxlandı</Notice>}
              {error && <Notice kind="error">{error}</Notice>}
            </div>
          </form>
        </SettingsRow>

        {/* ── Telegram ─────────────────────────────────────────────────────── */}
        <SettingsRow
          title="Telegram bildirişləri"
          description="Müştəri təklifi açanda, cavab verəndə və ya otel seçəndə telefonunuza dərhal mesaj gəlsin."
        >
          <TelegramSection />
        </SettingsRow>

        {/* ── Notification preferences ────────────────────────────────────── */}
        <SettingsRow
          title="Bildiriş qaydaları"
          description="Hansı bildirişlərin nə vaxt göndəriləcəyini seçin."
        >
          <NotificationSettingsSection />
        </SettingsRow>

        {/* ── Password ─────────────────────────────────────────────────────── */}
        <SettingsRow title="Şifrə və təhlükəsizlik" description="Şifrəni dəyişmək üçün hesabın e-poçtuna təsdiq linki göndərilir.">
          <ChangePasswordSection />
        </SettingsRow>
      </div>
    </main>
  );
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
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
        setTgError('Telegram botu hələ qoşulmayıb. Bir az sonra yenidən cəhd edin.');
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

  if (status === 'loading') {
    return <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      {status === 'connected' && (
        <div className="rounded-lg border border-slate-200 p-4 flex items-center gap-3 flex-wrap">
          <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
            <Icon name="check" className="w-4 h-4" strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">Telegram qoşulub</p>
            {chatId && <p className="text-xs text-slate-500">Chat ID: {chatId}</p>}
          </div>
          <button onClick={handleTest} disabled={testing} className="btn btn-sm btn-secondary">
            <Icon name={testOk ? 'check' : 'send'} className="w-3.5 h-3.5" />
            {testOk ? 'Göndərildi' : testing ? 'Göndərilir…' : 'Test mesajı'}
          </button>
          <button onClick={handleDisconnect} className="btn btn-sm btn-ghost hover:text-red-600">
            Ayır
          </button>
        </div>
      )}

      {status === 'disconnected' && !deepLink && (
        <button onClick={handleConnect} disabled={connecting} className="btn btn-md btn-dark">
          <Icon name="send" className="w-4 h-4" />
          {connecting ? 'Hazırlanır…' : 'Telegram-a qoş'}
        </button>
      )}

      {status === 'disconnected' && deepLink && (
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <p className="text-sm text-ink">Telegram-da botu açın və <span className="font-medium">Start</span> düyməsini basın.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={deepLink} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-primary">
              <Icon name="send" className="w-4 h-4" />
              Telegram-da aç
            </a>
            <button onClick={() => { setDeepLink(null); refreshStatus(); }} className="btn btn-md btn-secondary">
              Qoşuldu, yoxla
            </button>
          </div>
          <p className="text-xs text-slate-500">Link 15 dəqiqə etibarlıdır.</p>
        </div>
      )}

      {tgError && <Notice kind="error">{tgError}</Notice>}
    </div>
  );
}

// ─── Notification preferences ────────────────────────────────────────────────
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
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        {([
          { key: 'highEnabled',   label: 'Vacib hadisələr',   desc: 'İlk baxış, müştərinin cavabı və otel seçimi — dərhal' },
          { key: 'normalEnabled', label: 'Təkrar baxışlar',    desc: 'Eyni təklifə təkrar baxış — 3 saatda bir dəfə' },
          { key: 'lowEnabled',    label: 'Xatırlatmalar',      desc: 'Sakit saatlarda göndərilmir' },
        ] as { key: 'highEnabled' | 'normalEnabled' | 'lowEnabled'; label: string; desc: string }[]).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm text-ink">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <Switch on={settings[key]} label={label} onChange={() => setSettings(s => ({ ...s, [key]: !s[key] }))} />
          </div>
        ))}
      </div>

      <div>
        <p className="label">Sakit saatlar (Bakı vaxtı)</p>
        <div className="flex items-center gap-2">
          <select
            value={settings.quietStart}
            onChange={e => setSettings(s => ({ ...s, quietStart: parseInt(e.target.value) }))}
            className="input w-28"
            aria-label="Başlanğıc"
          >
            {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
          <span className="text-slate-400 text-sm">—</span>
          <select
            value={settings.quietEnd}
            onChange={e => setSettings(s => ({ ...s, quietEnd: parseInt(e.target.value) }))}
            className="input w-28"
            aria-label="Bitmə"
          >
            {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-500 mt-2">Bu aralıqda yalnız vacib hadisələr göndərilir.</p>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn btn-md btn-primary">
          {saving ? 'Saxlanılır…' : 'Yadda saxla'}
        </button>
        {saved && <Notice kind="success">Yadda saxlandı</Notice>}
      </div>
    </div>
  );
}

// ─── Password ─────────────────────────────────────────────────────────────────
// The password is never changed inline: a confirmation link goes to the
// account's own e-mail, so only the person with access to that inbox can set
// a new password (an open/unattended session is not enough).
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function ChangePasswordSection() {
  const [email,   setEmail]   = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    createSupabaseBrowserClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function sendLink() {
    if (!email) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError('Link göndərilmədi. Bir az sonra yenidən cəhd edin.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
          <Icon name="lock" className="w-4 h-4" />
        </span>
        <div className="text-sm">
          <p className="text-ink">Şifrə yalnız e-poçt təsdiqi ilə dəyişdirilir</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Təsdiq linki {email ? <span className="font-medium text-slate-700">{maskEmail(email)}</span> : 'hesabınızın e-poçtuna'} ünvanına göndəriləcək.
            Linki açıb yeni şifrəni təyin edin. Link 1 saat etibarlıdır.
          </p>
        </div>
      </div>

      {sent ? (
        <Notice kind="success">Link göndərildi — e-poçtunuzu yoxlayın (Spam qovluğunu da)</Notice>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={sendLink} disabled={sending || !email} className="btn btn-md btn-dark">
            <Icon name="mail" className="w-4 h-4" />
            {sending ? 'Göndərilir…' : 'Təsdiq linki göndər'}
          </button>
          {error && <Notice kind="error">{error}</Notice>}
        </div>
      )}
    </div>
  );
}
