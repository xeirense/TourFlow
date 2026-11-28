'use client';

import { useState, useEffect } from 'react';
import Icon from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';
import type { PlanTier } from '@/lib/planConfig';

interface TeamMember {
  id: string;
  invited_email: string;
  display_name: string | null;
  role: 'owner' | 'agent';
  status: 'active' | 'invited';
  created_at: string;
  member_user_id?: string | null;
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

  async function handleDelete(id: string, email: string, memberUserId: string | null) {
    if (!confirm(`"${email}" üzvünü komandadan çıxarmaq istəyirsiniz?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== id));
      // Reassign their clients to owner
      if (memberUserId) {
        await fetch('/api/clients/reassign', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fromManagerId: memberUserId, toManagerId: null }),
        }).catch(() => {/* non-critical */});
      }
    }
    setDeletingId(null);
  }

  const activeCount     = members.filter(m => m.status === 'active').length;
  const invitedCount    = members.filter(m => m.status === 'invited').length;
  const totalWithOwner  = members.length + 1; // +1 for owner
  const memberLimit     = planStatus?.memberLimit ?? null;
  const atLimit         = memberLimit !== null && totalWithOwner >= memberLimit;

  const waSupport = process.env.NEXT_PUBLIC_SUPPORT_WA;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <PageTitle
        title="Komanda"
        subtitle={
          <>
            {activeCount} aktiv
            {invitedCount > 0 && ` · ${invitedCount} dəvət gözləyir`}
            {memberLimit !== null && ` · plan limiti ${memberLimit} menecer`}
          </>
        }
      />

      {/* ── Invite new member ─────────────────────────────────────────────── */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-ink">Menecer dəvət et</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Menecer bu e-poçtla TourFlow-a daxil olduqda avtomatik komandanıza qoşulur.
        </p>

        {atLimit && (
          <div className="mb-4 flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <Icon name="lock" className="w-4 h-4 text-slate-400 flex-shrink-0 mt-px" />
            <p>
              Planınızın {memberLimit} menecer limiti dolub.
              {waSupport && (
                <a
                  href={`https://wa.me/${waSupport.replace(/\D/g, '')}?text=${encodeURIComponent('Salam! TourFlow komanda limitini artırmaq üçün planımı yüksəltmək istəyirəm.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 font-medium text-brand-700 hover:underline"
                >
                  Planı yüksəlt
                </a>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="label">E-poçt</label>
            <input
              type="email"
              value={invEmail}
              onChange={e => setInvEmail(e.target.value)}
              placeholder="menecer@agentlik.az"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Ad (istəyə görə)</label>
            <input
              type="text"
              value={invName}
              onChange={e => setInvName(e.target.value)}
              placeholder="Əli Hüseynov"
              className="input"
            />
          </div>
          <button type="submit" disabled={inviting || atLimit} className="btn btn-md btn-primary">
            <Icon name="plus" className="w-4 h-4" strokeWidth={2} />
            {inviting ? 'Əlavə edilir…' : 'Dəvət et'}
          </button>
        </form>

        {error   && <p className="text-xs text-red-600 mt-3">{error}</p>}
        {success && (
          <p className="text-xs text-brand-700 mt-3 inline-flex items-center gap-1">
            <Icon name="check" className="w-3.5 h-3.5" />
            {success}
          </p>
        )}
      </section>

      {/* ── Members list ──────────────────────────────────────────────────── */}
      <section className="card">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Komanda üzvləri</h2>
          {!loading && <span className="text-xs text-slate-500">{members.length}</span>}
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Icon name="users" className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-ink mt-4">Hələ komanda üzvü yoxdur</p>
            <p className="text-sm text-slate-500 mt-1">Yuxarıdan e-poçt ilə menecer dəvət edin.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map(m => (
              <li key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm flex items-center justify-center flex-shrink-0 uppercase">
                  {(m.display_name || m.invited_email).charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{m.display_name || m.invited_email}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {m.display_name ? `${m.invited_email} · ` : ''}
                    {new Date(m.created_at).toLocaleDateString('az-AZ')} tarixindən
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.status === 'active'
                    ? <span className="pill pill-brand">Aktiv</span>
                    : <span className="pill pill-neutral">Dəvət gözləyir</span>}
                  <span className="pill pill-neutral hidden sm:inline-flex">{m.role === 'owner' ? 'Sahib' : 'Menecer'}</span>
                  <button
                    onClick={() => handleDelete(m.id, m.invited_email, m.member_user_id ?? null)}
                    disabled={deletingId === m.id}
                    className="btn btn-sm btn-ghost px-2 hover:text-red-600 hover:bg-red-50"
                    title="Komandadan çıxar"
                    aria-label="Komandadan çıxar"
                  >
                    {deletingId === m.id ? '…' : <Icon name="x" className="w-4 h-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white/60 p-5">
        <p className="text-xs font-medium text-ink flex items-center gap-1.5 mb-2">
          <Icon name="info" className="w-4 h-4 text-slate-400" />
          Necə işləyir
        </p>
        <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc marker:text-slate-300">
          <li>Menecerin e-poçtunu əlavə edin</li>
          <li>Menecer həmin e-poçtla daxil olanda komandanıza avtomatik qoşulur</li>
          <li>Onların göndərdiyi təkliflər sizin paneldə görünür</li>
          <li>Hər menecer yalnız öz müştərilərini idarə edir</li>
        </ul>
      </section>
    </main>
  );
}
