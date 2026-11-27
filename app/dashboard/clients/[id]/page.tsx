'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ACTIVITY_LABELS, SOURCE_LABELS, type TFClient, type ClientActivity, type Reminder } from '@/lib/types';

interface OfferRow {
  id: string;
  destination: string;
  date_range: string;
  hotels: { name: string; price: number; currency: string }[];
  created_at: string;
  views_count: number;
  status: string | null;
  customer_response: string | null;
  expires_at: string | null;
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'indicə';
  if (mins < 60)  return `${mins} dəq əvvəl`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days  = Math.floor(hours / 24);
  return `${days} gün əvvəl`;
}

export default function ClientProfilePage() {
  const params = useParams();
  const id     = params.id as string;
  const router = useRouter();

  const [client,     setClient]     = useState<TFClient | null>(null);
  const [offers,     setOffers]     = useState<OfferRow[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [reminders,  setReminders]  = useState<Reminder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Reminder modal
  const [showReminder,  setShowReminder]  = useState(false);
  const [reminderText,  setReminderText]  = useState('');
  const [reminderDate,  setReminderDate]  = useState('');
  const [savingReminder, setSavingReminder] = useState(false);

  // Note modal
  const [showNote,  setShowNote]  = useState(false);
  const [noteText,  setNoteText]  = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Do-not-contact toggle
  const [doNotContact, setDoNotContact] = useState(false);
  async function toggleDoNotContact(val: boolean) {
    setDoNotContact(val);
    await fetch(`/api/clients/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ doNotContact: val }),
    });
  }

  // Edit preferences
  const [showPrefs,      setShowPrefs]      = useState(false);
  const [prefNotes,      setPrefNotes]      = useState('');
  const [prefDests,      setPrefDests]      = useState('');
  const [prefBudgetMin,  setPrefBudgetMin]  = useState('');
  const [prefBudgetMax,  setPrefBudgetMax]  = useState('');
  const [prefTags,       setPrefTags]       = useState('');
  const [savingPrefs,    setSavingPrefs]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/clients/${id}`);
      if (res.status === 404) { router.push('/dashboard/clients'); return; }
      const data = await res.json();
      const c    = data.client;

      // Map snake_case → camelCase
      const mapped: TFClient = {
        id:                   c.id,
        agencyOwnerId:        c.agency_owner_id,
        assignedManagerId:    c.assigned_manager_id ?? null,
        fullName:             c.full_name,
        phone:                c.phone,
        email:                c.email,
        birthday:             c.birthday,
        notes:                c.notes,
        tags:                 c.tags ?? [],
        budgetMin:            c.budget_min,
        budgetMax:            c.budget_max,
        currency:             c.currency ?? 'AZN',
        travelers:            c.travelers ?? { adults: 2, children: 0, child_ages: [] },
        preferredDestinations: c.preferred_destinations ?? [],
        preferredStars:       c.preferred_stars,
        preferredMeal:        c.preferred_meal,
        source:               c.source ?? 'whatsapp',
        createdAt:            c.created_at,
      };
      setClient(mapped);
      setDoNotContact(c.do_not_contact ?? false);
      setOffers(data.offers ?? []);
      setReminders((data.reminders ?? []).map((r: Record<string, unknown>) => ({
        id:        r.id,
        clientId:  r.client_id,
        managerId: r.manager_id,
        dueAt:     r.due_at,
        kind:      r.kind,
        text:      r.text,
        doneAt:    r.done_at ?? null,
        createdAt: r.created_at,
      })));

      // Merge activities from API + map
      setActivities((data.activities ?? []).map((a: Record<string, unknown>) => ({
        id:        a.id,
        clientId:  a.client_id,
        type:      a.type,
        payload:   a.payload ?? {},
        createdAt: a.created_at,
      })));

      // Pre-fill pref editor
      setPrefNotes(c.notes ?? '');
      setPrefDests((c.preferred_destinations ?? []).join(', '));
      setPrefBudgetMin(c.budget_min ?? '');
      setPrefBudgetMax(c.budget_max ?? '');
      setPrefTags((c.tags ?? []).join(', '));
    } catch {
      setError('Yüklənə bilmədi');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function addReminder() {
    if (!reminderText.trim() || !reminderDate) return;
    setSavingReminder(true);
    await fetch(`/api/clients/${id}/reminders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: reminderText, dueAt: new Date(reminderDate).toISOString() }),
    });
    setSavingReminder(false);
    setShowReminder(false);
    setReminderText('');
    setReminderDate('');
    load();
  }

  async function markDone(reminderId: string) {
    await fetch(`/api/reminders/${reminderId}/done`, { method: 'PATCH' });
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, doneAt: new Date().toISOString() } : r));
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await fetch(`/api/clients/${id}/activities`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'note', payload: { text: noteText } }),
    });
    setSavingNote(false);
    setShowNote(false);
    setNoteText('');
    load();
  }

  async function savePrefs() {
    setSavingPrefs(true);
    await fetch(`/api/clients/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        notes:                 prefNotes.trim() || null,
        preferredDestinations: prefDests.split(',').map(s => s.trim()).filter(Boolean),
        budgetMin:             prefBudgetMin ? parseFloat(prefBudgetMin) : null,
        budgetMax:             prefBudgetMax ? parseFloat(prefBudgetMax) : null,
        tags:                  prefTags.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    setSavingPrefs(false);
    setShowPrefs(false);
    load();
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <span className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !client) return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4">
      <p className="text-slate-500">{error || 'Tapılmadı'}</p>
      <Link href="/dashboard/clients" className="text-teal-600 text-sm font-semibold">← Geri qayıt</Link>
    </div>
  );

  const dueReminders  = reminders.filter(r => !r.doneAt && new Date(r.dueAt) <= new Date());
  const upcoming      = reminders.filter(r => !r.doneAt && new Date(r.dueAt) > new Date());
  const done          = reminders.filter(r => !!r.doneAt);
  const travelers     = client.travelers;
  const travelersText = `${travelers.adults} böyük${travelers.children > 0 ? `, ${travelers.children} uşaq` : ''}`;

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition';

  // Build timeline: merge offers + activities, sort by date
  type TimelineItem =
    | { kind: 'offer';    data: OfferRow;         date: string }
    | { kind: 'activity'; data: ClientActivity;   date: string };

  const timeline: TimelineItem[] = [
    ...offers.map(o => ({ kind: 'offer' as const, data: o, date: o.created_at })),
    ...activities.map(a => ({ kind: 'activity' as const, data: a, date: a.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard/clients" className="text-slate-400 hover:text-white transition-colors text-xl">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{client.fullName}</h1>
            <p className="text-slate-500 text-xs">{SOURCE_LABELS[client.source]} · {travelersText}</p>
          </div>
          <Link
            href={`/create?clientName=${encodeURIComponent(client.fullName)}&clientPhone=${encodeURIComponent(client.phone)}&adults=${travelers.adults}&children=${travelers.children}`}
            className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            + Yeni Təklif
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Due reminders banner */}
        {dueReminders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-2">🔔 Gecikmiş xatırlatmalar</p>
            <ul className="space-y-2">
              {dueReminders.map(r => (
                <li key={r.id} className="flex items-center gap-3">
                  <p className="flex-1 text-sm text-amber-900">{r.text}</p>
                  <button
                    onClick={() => markDone(r.id)}
                    className="text-xs text-amber-700 border border-amber-300 rounded-lg px-2.5 py-1 hover:bg-amber-100 transition-colors"
                  >
                    ✓ Tamamlandı
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center font-black text-teal-700 text-lg">
                {client.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{client.fullName}</p>
                {client.phone && (
                  <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline">
                    {client.phone}
                  </a>
                )}
                {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
              </div>
            </div>
            <button
              onClick={() => setShowPrefs(true)}
              className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              ✏️ Redaktə
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div>
              <p className="text-slate-400 mb-0.5">Mənbə</p>
              <p className="font-semibold text-slate-700">{SOURCE_LABELS[client.source]}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">Səyahətçilər</p>
              <p className="font-semibold text-slate-700">{travelersText}</p>
            </div>
            {(client.budgetMin || client.budgetMax) && (
              <div>
                <p className="text-slate-400 mb-0.5">Büdcə</p>
                <p className="font-semibold text-slate-700">
                  {client.budgetMin ?? '—'} – {client.budgetMax ?? '—'} {client.currency}
                </p>
              </div>
            )}
            {client.preferredDestinations.length > 0 && (
              <div>
                <p className="text-slate-400 mb-0.5">İstiqamətlər</p>
                <p className="font-semibold text-slate-700">{client.preferredDestinations.join(', ')}</p>
              </div>
            )}
            {client.birthday && (
              <div>
                <p className="text-slate-400 mb-0.5">Doğum tarixi</p>
                <p className="font-semibold text-slate-700">{client.birthday}</p>
              </div>
            )}
          </div>

          {client.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {client.tags.map(t => (
                <span key={t} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}

          {client.notes && (
            <p className="text-xs text-slate-500 italic mt-3 border-t border-slate-100 pt-3">{client.notes}</p>
          )}

          {/* Do-not-contact toggle */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-700">Əlaqə etmə</p>
              <p className="text-xs text-slate-400">Aktiv edildikdə avtomatik xatırlatmalar göndərilmir</p>
            </div>
            <button
              type="button"
              onClick={() => toggleDoNotContact(!doNotContact)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                doNotContact ? 'bg-red-500' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                doNotContact ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowReminder(true)}
            className="flex-1 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors"
          >
            🔔 Xatırlatma əlavə et
          </button>
          <button
            onClick={() => setShowNote(true)}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors"
          >
            📝 Qeyd yaz
          </button>
        </div>

        {/* Upcoming reminders */}
        {upcoming.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Gözləyən xatırlatmalar</p>
            <ul className="space-y-2">
              {upcoming.map(r => (
                <li key={r.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{r.text}</p>
                    <p className="text-xs text-slate-400">{new Date(r.dueAt).toLocaleDateString('az-AZ')}</p>
                  </div>
                  <button
                    onClick={() => markDone(r.id)}
                    className="text-xs text-slate-400 hover:text-green-600 transition-colors"
                  >
                    ✓
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Tarixçə</p>
          {timeline.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Hələ heç bir aktivlik yoxdur</p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-6 flex-shrink-0 flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      item.kind === 'offer' ? 'bg-teal-400' : 'bg-slate-300'
                    }`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    {item.kind === 'offer' ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                            Təklif göndərildi
                          </span>
                          <span className="text-xs text-slate-400">{timeAgo(item.date)}</span>
                        </div>
                        <Link
                          href={`/offer/${item.data.id}`}
                          target="_blank"
                          className="text-sm text-slate-700 font-medium hover:text-teal-600 transition-colors"
                        >
                          {item.data.destination}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {item.data.hotels?.map((h: { name: string }) => h.name).join(', ')}
                        </p>
                        {item.data.views_count > 0 && (
                          <p className="text-xs text-slate-400">{item.data.views_count} baxış</p>
                        )}
                        {item.data.customer_response && (
                          <span className={`inline-block text-xs font-semibold mt-1 px-2 py-0.5 rounded-full ${
                            item.data.customer_response === 'interested' ? 'bg-green-50 text-green-700' :
                            item.data.customer_response === 'price_high' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {item.data.customer_response === 'interested' ? 'Maraqlandı' :
                             item.data.customer_response === 'price_high' ? 'Qiymət yüksəkdir' : 'Maraqlanmadı'}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {ACTIVITY_LABELS[item.data.type]}
                          </span>
                          <span className="text-xs text-slate-400">{timeAgo(item.date)}</span>
                        </div>
                        {(item.data.payload as { text?: string })?.text && (
                          <p className="text-sm text-slate-600 mt-0.5">
                            {(item.data.payload as { text: string }).text}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Done reminders (collapsed) */}
        {done.length > 0 && (
          <details className="bg-white rounded-2xl border border-slate-100 p-4">
            <summary className="text-xs font-bold text-slate-400 cursor-pointer">
              ✓ Tamamlanmış xatırlatmalar ({done.length})
            </summary>
            <ul className="mt-3 space-y-1.5">
              {done.map(r => (
                <li key={r.id} className="text-xs text-slate-400 line-through">{r.text}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Reminder modal */}
      {showReminder && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Xatırlatma əlavə et</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mətn</label>
              <input
                type="text"
                value={reminderText}
                onChange={e => setReminderText(e.target.value)}
                placeholder="Aysel xanıma zəng et..."
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tarix</label>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={e => setReminderDate(e.target.value)}
                className={inputCls}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReminder(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
                Ləğv et
              </button>
              <button
                onClick={addReminder}
                disabled={savingReminder || !reminderText || !reminderDate}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold disabled:opacity-60 transition-colors"
              >
                {savingReminder ? '...' : 'Saxla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note modal */}
      {showNote && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Qeyd yaz</h2>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Müştəri haqqında qeyd..."
              rows={4}
              className={`${inputCls} resize-none`}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNote(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
                Ləğv et
              </button>
              <button
                onClick={addNote}
                disabled={savingNote || !noteText}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold disabled:opacity-60 transition-colors"
              >
                {savingNote ? '...' : 'Qeyd et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences editor modal */}
      {showPrefs && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 my-4">
            <h2 className="font-bold text-slate-800">Üstünlükləri redaktə et</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Qeyd</label>
              <textarea value={prefNotes} onChange={e => setPrefNotes(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">İstiqamətlər (vergüllə)</label>
              <input type="text" value={prefDests} onChange={e => setPrefDests(e.target.value)} placeholder="Antalya, Dubai" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Büdcə min</label>
                <input type="number" value={prefBudgetMin} onChange={e => setPrefBudgetMin(e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Büdcə maks</label>
                <input type="number" value={prefBudgetMax} onChange={e => setPrefBudgetMax(e.target.value)} className={inputCls} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Teqlər (vergüllə)</label>
              <input type="text" value={prefTags} onChange={e => setPrefTags(e.target.value)} placeholder="VIP, ailə" className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPrefs(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
                Ləğv et
              </button>
              <button
                onClick={savePrefs}
                disabled={savingPrefs}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold disabled:opacity-60 transition-colors"
              >
                {savingPrefs ? '...' : 'Saxla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
