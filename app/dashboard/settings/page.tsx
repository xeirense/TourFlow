'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();

  const [agencyName, setAgencyName] = useState('');
  const [agencyLogo, setAgencyLogo] = useState('');
  const [whatsapp,   setWhatsapp]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');

  // Load current profile
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(p => {
        if (p.agency_name) setAgencyName(p.agency_name);
        if (p.agency_logo) setAgencyLogo(p.agency_logo);
        if (p.whatsapp)    setWhatsapp(p.whatsapp);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyName, agencyLogo, whatsapp }),
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

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">

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

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Loqo URL-i (opsional)
            </label>
            <input
              type="url"
              value={agencyLogo}
              onChange={e => setAgencyLogo(e.target.value)}
              placeholder="https://..."
              className={inputCls}
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
            {saved ? '✓ Yadda saxlandı!' : loading ? 'Yüklənir...' : 'Yadda saxla'}
          </button>
        </form>
      </div>
    </div>
  );
}
