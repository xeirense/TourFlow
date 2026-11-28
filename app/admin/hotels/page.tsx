'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import TestCronButton from './TestCronButton';

interface HotelRow {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  default_meal: string;
  description_az: string | null;
  photos: string[];
  source: string;
  verified: boolean;
  usage_count: number;
  created_at: string;
  chain: string | null;
  aliases: string[];
}

interface EditState {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  default_meal: string;
  description_az: string;
  chain: string;
  aliases: string; // comma-separated
}

export default function AdminHotelsPage() {
  const supabase = createSupabaseBrowserClient();

  const [hotels,   setHotels]   = useState<HotelRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [isAdmin,  setIsAdmin]  = useState<boolean | null>(null);
  const [editRow,  setEditRow]  = useState<EditState | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [filter,   setFilter]   = useState<'unverified' | 'all'>('unverified');

  // ── Auth + admin check ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }

      const { data: profile } = await supabase
        .from('agency_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(profile?.is_admin === true);
    })();
  }, []);

  // ── Load hotels ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAdmin !== true) return;
    loadHotels();
  }, [isAdmin, filter]);

  async function loadHotels() {
    setLoading(true);
    let q = supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filter === 'unverified') q = q.eq('verified', false);

    const { data } = await q;
    setHotels((data ?? []) as HotelRow[]);
    setLoading(false);
  }

  // ── Verify ────────────────────────────────────────────────────────────────────
  async function handleVerify(id: string) {
    await supabase.from('hotels').update({ verified: true }).eq('id', id);
    setHotels(prev => prev.map(h => h.id === id ? { ...h, verified: true } : h));
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Bu oteli silmək istədiyinizə əminsiniz?')) return;
    await supabase.from('hotels').delete().eq('id', id);
    setHotels(prev => prev.filter(h => h.id !== id));
  }

  // ── Save edit ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!editRow) return;
    setSaving(true);
    const aliasArr = editRow.aliases
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    await supabase.from('hotels').update({
      name:           editRow.name,
      city:           editRow.city,
      country:        editRow.country,
      stars:          editRow.stars,
      default_meal:   editRow.default_meal,
      description_az: editRow.description_az || null,
      chain:          editRow.chain.trim() || null,
      aliases:        aliasArr,
    }).eq('id', editRow.id);

    setHotels(prev => prev.map(h => h.id === editRow.id
      ? { ...h, name: editRow.name, city: editRow.city, country: editRow.country,
          stars: editRow.stars, default_meal: editRow.default_meal,
          description_az: editRow.description_az || null,
          chain: editRow.chain.trim() || null,
          aliases: aliasArr }
      : h
    ));
    setEditRow(null);
    setSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4">
        <p className="text-2xl">🚫</p>
        <p className="text-slate-700 font-semibold">Admin icazəsi tələb olunur</p>
        <Link href="/dashboard" className="text-brand-600 text-sm hover:underline">← Dashboard-a qayıt</Link>
      </div>
    );
  }

  const unverifiedCount = hotels.filter(h => !h.verified).length;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-ink border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xl">←</Link>
          <div className="flex-1">
            <h1 className="font-bold text-base">🏨 Hotel Kataloqu — Admin</h1>
            <p className="text-slate-500 text-xs">{hotels.length} otel • {unverifiedCount} təsdiqlənməmiş</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter(f => f === 'unverified' ? 'all' : 'unverified')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === 'unverified'
                  ? 'bg-slate-500 text-white border-slate-500'
                  : 'bg-white/10 text-slate-300 border-white/10 hover:border-white/30'
              }`}
            >
              {filter === 'unverified' ? 'Hamısını göstər' : 'Yalnız təsdiqlənməmiş'}
            </button>
            <button
              onClick={loadHotels}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/10 text-slate-300 hover:border-white/30 transition-colors"
            >
              Yenilə
            </button>
          </div>
        </div>
      </header>

      {/* Cron test section */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3 mb-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-700">Cron Xatırlatma Sistemi</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hər gün 07:00 UTC (11:00 Bakı) işləyir. &quot;Test&quot; yalnız sizin agentliyi emal edir.
            </p>
          </div>
          <TestCronButton />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="inline-block w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-slate-500 text-sm">
              {filter === 'unverified' ? 'Bütün otellər təsdiqlənib' : 'Otel tapılmadı'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {hotels.map(h => (
              <div
                key={h.id}
                className={`bg-white rounded-2xl border px-4 py-3 ${h.verified ? 'border-slate-100' : 'border-slate-200 bg-slate-50/30'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Stars badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    h.verified ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {h.stars}★
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{h.name}</span>
                      <span className="text-xs text-slate-400">{h.city}, {h.country}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{h.default_meal}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        h.source === 'seed' ? 'bg-brand-100 text-brand-600' :
                        h.source === 'agency' ? 'bg-brand-100 text-brand-600' :
                        'bg-brand-100 text-brand-600'
                      }`}>{h.source}</span>
                      {h.verified && (
                        <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-semibold">✓ Təsdiqlənib</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">{h.usage_count} istifadə</span>
                      {h.photos.length > 0 && (
                        <span className="text-xs text-slate-400">{h.photos.length} şəkil</span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">{h.id}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditRow({
                        id: h.id, name: h.name, city: h.city, country: h.country,
                        stars: h.stars, default_meal: h.default_meal,
                        description_az: h.description_az ?? '',
                        chain: h.chain ?? '',
                        aliases: (h.aliases ?? []).join(', '),
                      })}
                      className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      Düzəlt
                    </button>
                    {!h.verified && (
                      <button
                        onClick={() => handleVerify(h.id)}
                        className="text-xs text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg px-2.5 py-1 transition-colors font-semibold"
                      >
                        ✓ Təsdiqlə
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md space-y-3">
            <h2 className="font-bold text-slate-800">Oteli düzəlt</h2>

            {([
              { label: 'Ad', key: 'name', type: 'text' },
              { label: 'Şəhər', key: 'city', type: 'text' },
              { label: 'Ölkə', key: 'country', type: 'text' },
            ] as { label: string; key: keyof EditState; type: string }[]).map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={editRow[f.key] as string}
                  onChange={e => setEditRow(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Ulduz</label>
                <select
                  value={editRow.stars}
                  onChange={e => setEditRow(prev => prev ? { ...prev, stars: parseInt(e.target.value) } : null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none"
                >
                  <option value={3}>3 ★</option>
                  <option value={4}>4 ★</option>
                  <option value={5}>5 ★</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Qidalanma</label>
                <select
                  value={editRow.default_meal}
                  onChange={e => setEditRow(prev => prev ? { ...prev, default_meal: e.target.value } : null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none"
                >
                  {['RO','BB','HB','FB','AI','UAI'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Qısa təsvir (az)</label>
              <textarea
                value={editRow.description_az}
                onChange={e => setEditRow(prev => prev ? { ...prev, description_az: e.target.value } : null)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Zəncir (chain)</label>
              <input
                type="text"
                value={editRow.chain}
                onChange={e => setEditRow(prev => prev ? { ...prev, chain: e.target.value } : null)}
                placeholder="Rixos, Hilton..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Aliaslar (vergüllə ayırın)</label>
              <input
                type="text"
                value={editRow.aliases}
                onChange={e => setEditRow(prev => prev ? { ...prev, aliases: e.target.value } : null)}
                placeholder="Sungate, Rixos Kemer..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditRow(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Ləğv et
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                {saving ? 'Saxlanır...' : 'Saxla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
