'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ACTIVITY_LABELS, SOURCE_LABELS, type TFClient, type ClientActivity, type Reminder } from '@/lib/types';
import Icon from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';

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
    <div className="py-24 flex items-center justify-center">
      <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-ink rounded-full animate-spin" />
    </div>
  );

  if (error || !client) return (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <p className="text-slate-500 text-sm">{error || 'Müştəri tapılmadı'}</p>
      <Link href="/dashboard/clients" className="btn btn-sm btn-secondary">
        <Icon name="back" className="w-3.5 h-3.5" />
        Müştərilər
      </Link>
    </div>
  );

  const dueReminders  = reminders.filter(r => !r.doneAt && new Date(r.dueAt) <= new Date());
  const upcoming      = reminders.filter(r => !r.doneAt && new Date(r.dueAt) > new Date());
  const done          = reminders.filter(r => !!r.doneAt);
  const travelers     = client.travelers;
  const travelersText = `${travelers.adults} böyük${travelers.children > 0 ? `, ${travelers.children} uşaq` : ''}`;

  const inputCls = 'input';

  // Build timeline: merge offers + activities, sort by date
  type TimelineItem =
    | { kind: 'offer';    data: OfferRow;         date: string }
    | { kind: 'activity'; data: ClientActivity;   date: string };

  const timeline: TimelineItem[] = [
    ...offers.map(o => ({ kind: 'offer' as const, data: o, date: o.created_at })),
    ...activities.map(a => ({ kind: 'activity' as const, data: a, date: a.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const newOfferHref = `/create?clientName=${encodeURIComponent(client.fullName)}&clientPhone=${encodeURIComponent(client.phone)}&adults=${travelers.adults}&children=${travelers.children}`;

  return (
    <div>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <PageTitle
          title={client.fullName}
          subtitle={`${SOURCE_LABELS[client.source]} · ${travelersText}`}
          back={{ href: '/dashboard/clients', label: 'Müştərilər' }}
          actions={
            <>
              <button onClick={() => setShowReminder(true)} className="btn btn-sm btn-secondary">
                <Icon name="bell" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xatırlatma</span>
              </button>
              <button onClick={() => setShowNote(true)} className="btn btn-sm btn-secondary">
                <Icon name="note" className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Qeyd</span>
              </button>
              <Link href={newOfferHref} className="btn btn-sm btn-primary">
                <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2} />
                Yeni təklif
              </Link>
            </>
          }
        />

        <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">

          {/* ── Left column: profile ─────────────────────────────────── */}
          <div className="space-y-4">
            <section className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold flex-shrink-0">
                    {client.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{client.fullName}</p>
                    {client.phone && (
                      <a href={`https://wa.me/${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-700 hover:underline">
                        {client.phone}
                      </a>
                    )}
                    {client.email && <p className="text-xs text-slate-500 truncate">{client.email}</p>}
                  </div>
                </div>
                <button onClick={() => setShowPrefs(true)} className="btn btn-sm btn-ghost px-2" title="Redaktə et" aria-label="Redaktə et">
                  <Icon name="edit" className="w-4 h-4" />
                </button>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-5 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <dt className="text-slate-500">Mənbə</dt>
                  <dd className="text-ink mt-0.5">{SOURCE_LABELS[client.source]}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Səyahətçilər</dt>
                  <dd className="text-ink mt-0.5">{travelersText}</dd>
                </div>
                {(client.budgetMin || client.budgetMax) && (
                  <div>
                    <dt className="text-slate-500">Büdcə</dt>
                    <dd className="text-ink mt-0.5">{client.budgetMin ?? '—'} – {client.budgetMax ?? '—'} {client.currency}</dd>
                  </div>
                )}
                {client.preferredDestinations.length > 0 && (
                  <div>
                    <dt className="text-slate-500">İstiqamətlər</dt>
                    <dd className="text-ink mt-0.5">{client.preferredDestinations.join(', ')}</dd>
                  </div>
                )}
                {client.birthday && (
                  <div>
                    <dt className="text-slate-500">Doğum tarixi</dt>
                    <dd className="text-ink mt-0.5">{client.birthday}</dd>
                  </div>
                )}
              </dl>

              {client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {client.tags.map(t => <span key={t} className="pill pill-neutral">#{t}</span>)}
                </div>
              )}

              {client.notes && (
                <p className="text-xs text-slate-600 mt-4 pt-4 border-t border-slate-100 leading-relaxed">{client.notes}</p>
              )}

              {/* Do-not-contact toggle */}
              <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs font-medium text-ink">Xatırlatma göndərmə</p>
                  <p className="text-xs text-slate-500 mt-0.5">Bu müştəri üçün avtomatik xatırlatmalar dayanır</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={doNotContact}
                  onClick={() => toggleDoNotContact(!doNotContact)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                    doNotContact ? 'bg-ink' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    doNotContact ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </section>

            {/* Reminders */}
            {(dueReminders.length > 0 || upcoming.length > 0) && (
              <section className="card">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <Icon name="bell" className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-ink">Xatırlatmalar</h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {[...dueReminders, ...upcoming].map(r => {
                    const overdue = new Date(r.dueAt) <= new Date();
                    return (
                      <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink">{r.text}</p>
                          <p className={`text-xs mt-0.5 ${overdue ? 'text-brand-700 font-medium' : 'text-slate-500'}`}>
                            {overdue ? 'Vaxtı çatıb' : new Date(r.dueAt).toLocaleDateString('az-AZ')}
                          </p>
                        </div>
                        <button onClick={() => markDone(r.id)} className="btn btn-sm btn-secondary" title="Tamamlandı">
                          <Icon name="check" className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {done.length > 0 && (
              <details className="card px-5 py-3.5">
                <summary className="text-xs font-medium text-slate-500 cursor-pointer">
                  Tamamlanmış xatırlatmalar ({done.length})
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {done.map(r => (
                    <li key={r.id} className="text-xs text-slate-400 line-through">{r.text}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* ── Right column: timeline ───────────────────────────────── */}
          <section className="card">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-ink">Tarixçə</h2>
            </div>
            <div className="p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Hələ heç bir fəaliyyət yoxdur</p>
              ) : (
                <ul>
                  {timeline.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="w-4 flex-shrink-0 flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          item.kind === 'offer' ? 'bg-brand-600' : 'bg-slate-300'
                        }`} />
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-5 min-w-0">
                        {item.kind === 'offer' ? (
                          <>
                            <p className="text-xs text-slate-500">
                              Təklif göndərildi · {timeAgo(item.date)}
                            </p>
                            <Link
                              href={`/offer/${item.data.id}?preview=1`}
                              target="_blank"
                              className="text-sm text-ink font-medium hover:text-brand-700 transition-colors"
                            >
                              {item.data.destination}
                            </Link>
                            {item.data.hotels?.length > 0 && (
                              <p className="text-xs text-slate-500 truncate">
                                {item.data.hotels.map((h: { name: string }) => h.name).join(', ')}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {item.data.views_count > 0 && (
                                <span className="pill pill-neutral">{item.data.views_count} baxış</span>
                              )}
                              {item.data.status === 'selected' ? (
                                <span className="pill pill-strong">Otel seçdi</span>
                              ) : item.data.customer_response === 'interested' ? (
                                <span className="pill pill-brand">Maraqlanır</span>
                              ) : item.data.customer_response === 'price_high' ? (
                                <span className="pill pill-neutral">Qiymət yüksəkdir</span>
                              ) : item.data.customer_response === 'not_interested' ? (
                                <span className="pill pill-neutral text-slate-400">Maraqlanmır</span>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500">
                              {ACTIVITY_LABELS[item.data.type]} · {timeAgo(item.date)}
                            </p>
                            {(item.data.payload as { text?: string })?.text && (
                              <p className="text-sm text-slate-700 mt-0.5">
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
          </section>
        </div>
      </main>

      {/* Reminder modal */}
      {showReminder && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h2 className="font-semibold text-ink">Xatırlatma əlavə et</h2>
            <div>
              <label className="label">Mətn</label>
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
              <label className="label">Tarix</label>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={e => setReminderDate(e.target.value)}
                className={inputCls}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReminder(false)} className="btn btn-md btn-secondary flex-1">
                Ləğv et
              </button>
              <button
                onClick={addReminder}
                disabled={savingReminder || !reminderText || !reminderDate}
                className="btn btn-md btn-primary flex-1"
              >
                {savingReminder ? '...' : 'Saxla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note modal */}
      {showNote && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 shadow-2xl">
            <h2 className="font-semibold text-ink">Qeyd yaz</h2>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Müştəri haqqında qeyd..."
              rows={4}
              className={`${inputCls} h-auto py-2.5 resize-none`}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNote(false)} className="btn btn-md btn-secondary flex-1">
                Ləğv et
              </button>
              <button
                onClick={addNote}
                disabled={savingNote || !noteText}
                className="btn btn-md btn-primary flex-1"
              >
                {savingNote ? '...' : 'Qeyd et'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences editor modal */}
      {showPrefs && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200 shadow-2xl my-4">
            <h2 className="font-semibold text-ink">Üstünlükləri redaktə et</h2>
            <div>
              <label className="label">Qeyd</label>
              <textarea value={prefNotes} onChange={e => setPrefNotes(e.target.value)} rows={3} className={`${inputCls} h-auto py-2.5 resize-none`} />
            </div>
            <div>
              <label className="label">İstiqamətlər (vergüllə)</label>
              <input type="text" value={prefDests} onChange={e => setPrefDests(e.target.value)} placeholder="Antalya, Dubai" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Büdcə min</label>
                <input type="number" value={prefBudgetMin} onChange={e => setPrefBudgetMin(e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="label">Büdcə maks</label>
                <input type="number" value={prefBudgetMax} onChange={e => setPrefBudgetMax(e.target.value)} className={inputCls} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">Teqlər (vergüllə)</label>
              <input type="text" value={prefTags} onChange={e => setPrefTags(e.target.value)} placeholder="VIP, ailə" className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPrefs(false)} className="btn btn-md btn-secondary flex-1">
                Ləğv et
              </button>
              <button
                onClick={savePrefs}
                disabled={savingPrefs}
                className="btn btn-md btn-primary flex-1"
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
