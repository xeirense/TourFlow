'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { PlanTier } from '@/lib/planConfig';

interface TeamMember {
  id: string;
  invited_email: string;
  display_name: string | null;
  role: 'owner' | 'agent';
  status: 'active' | 'invited';
  created_at: string;
}

interface PlanStatus {
  tier: PlanTier;
  memberLimit: number | null;
}

export default function TeamPage() {
  const [members,    setMembers]    = useState<TeamMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [invEmail,   setInvEmail]   = useState('');
  const [invName,    setInvName]    = useState('');
  const [inviting,   setInviting]   = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => setPlanStatus({ tier: d.tier, memberLimit: d.memberLimit }))
      .catch(() => {});
  }, []);

  async function loadMembers() {
    setLoading(true);
    const res = await fetch('/api/team');
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = invEmail.trim();
    if (!email) return;
    setInviting(true);
    setError('');
    setSuccess('');

    const res = await fetch('/api/team', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, displayName: invName.trim() }),
    });

    if (res.ok) {
      setSuccess(`${email} komandaya əlavə edildi.`);
      setInvEmail('');
      setInvName('');
      loadMembers();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Əlavə etmək alınmadı.');
    }
    setInviting(false);
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`"${email}" üzvünü komandadan çıxarmaq istəyirsiniz?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  }

  const activeCount     = members.filter(m => m.status === 'active').length;
  const invitedCount    = members.filter(m => m.status === 'invited').length;
  const totalWithOwner  = members.length + 1; // +1 for owner
  const memberLimit     = planStatus?.memberLimit ?? null;
  const atLimit         = memberLimit !== null && totalWithOwner >= memberLimit;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 -ml-2"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-sm leading-tight">Komanda İdarəetməsi</h1>
            <p className="text-slate-500 text-xs">
              {activeCount} aktiv
              {invitedCount > 0 && ` · ${invitedCount} gözləyir`}
              {memberLimit !== null && ` · limit: ${memberLimit}`}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Invite new member ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-1">Yeni Üzv Əlavə Et</h2>
          <p className="text-xs text-slate-400 mb-4">
            E-poçt ünvanı ilə meneceri komandanıza əlavə edin. O giriş etdikdə avtomatik aktivləşəcək.
          </p>

          {atLimit && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
              🔒 {memberLimit} menecer limitinə çatdınız. Daha çox üzv əlavə etmək üçün planınızı yüksəldin.
              {process.env.NEXT_PUBLIC_SUPPORT_WA && (
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WA.replace(/\D/g, '')}?text=${encodeURIComponent('Salam! TourFlow komanda limitini artırmaq üçün planımı yüksəltmək istəyirəm.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1.5 underline font-bold"
                >
                  Planı Yüksəlt →
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  E-poçt <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  placeholder="menecer@email.com"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ad (ixtiyari)
                </label>
                <input
                  type="text"
                  value={invName}
                  onChange={e => setInvName(e.target.value)}
                  placeholder="Əli Hüseynov"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                />
              </div>
            </div>

            {error   && <p className="text-xs text-red-500 font-medium">{error}</p>}
            {success && <p className="text-xs text-teal-600 font-medium">✓ {success}</p>}

            <button
              type="submit"
              disabled={inviting || atLimit}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold text-sm transition-colors"
            >
              {inviting ? 'Əlavə edilir…' : atLimit ? '🔒 Limit dolub' : '+ Komandaya Əlavə Et'}
            </button>
          </form>
        </div>

        {/* ── Members list ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Komanda Üzvləri</h2>
            {!loading && (
              <span className="text-xs text-slate-400">{members.length} üzv</span>
            )}
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm font-semibold text-slate-600">Hələ komanda üzvü yoxdur</p>
              <p className="text-xs text-slate-400 mt-1">
                Yuxarıdan e-poçt ilə menecer əlavə edin
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {members.map(m => (
                <li key={m.id} className="px-5 py-4 flex items-center gap-3">

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
                    {(m.display_name || m.invited_email).charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {m.display_name || m.invited_email}
                    </p>
                    {m.display_name && (
                      <p className="text-xs text-slate-400 truncate">{m.invited_email}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(m.created_at).toLocaleDateString('az-AZ')} tarixindən
                    </p>
                  </div>

                  {/* Badges + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.status === 'active' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                        Aktiv
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        Gözləyir
                      </span>
                    )}

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {m.role === 'owner' ? 'Sahib' : 'Agent'}
                    </span>

                    <button
                      onClick={() => handleDelete(m.id, m.invited_email)}
                      disabled={deletingId === m.id}
                      className="ml-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                      title="Komandadan çıxar"
                    >
                      {deletingId === m.id ? '…' : '✕'}
                    </button>
                  </div>

                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Info box ──────────────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-700 font-semibold mb-1">ℹ️ Necə işləyir?</p>
          <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
            <li>E-poçt ilə üzv əlavə edin</li>
            <li>O həmin e-poçtla TourFlow-a giriş etdikdə avtomatik komandanıza bağlanır</li>
            <li>Onların yaratdığı bütün təkliflər sizin dashboard-da görünür</li>
            <li>Hər menecer yalnız öz müştərilərini idarə edir</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
