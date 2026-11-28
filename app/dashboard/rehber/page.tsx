import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { PLANS, getEffectivePlan, DEFAULT_PLAN_DATA, type ProfilePlanData } from '@/lib/planConfig';
import Icon, { type IconName } from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OfferRow {
  id: string;
  agency_id: string;
  created_by: string | null;
  client_name: string;
  destination: string;
  created_at: string;
  views_count: number | null;
  status: string | null;
  customer_response: string | null;
  expires_at: string | null;
  last_viewed_at: string | null;
}
interface MemberRow {
  member_user_id: string | null;
  invited_email: string;
  display_name: string | null;
  status: string;
}
interface ReminderRow {
  manager_id: string;
  due_at: string;
  done_at: string | null;
}

const PERIODS = [
  { key: '7',  label: '7 gün' },
  { key: '30', label: '30 gün' },
  { key: '90', label: '90 gün' },
] as const;

const DAY = 86_400_000;

function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function delta(cur: number, prev: number): { text: string; up: boolean | null } {
  if (prev === 0) return { text: cur > 0 ? 'yeni' : '—', up: cur > 0 ? true : null };
  const d = Math.round(((cur - prev) / prev) * 100);
  return { text: `${d > 0 ? '+' : ''}${d}%`, up: d === 0 ? null : d > 0 };
}

interface Stats { sent: number; viewed: number; responded: number; selected: number }
function statsOf(rows: OfferRow[]): Stats {
  return {
    sent:      rows.length,
    viewed:    rows.filter(o => (o.views_count ?? 0) > 0).length,
    responded: rows.filter(o => o.customer_response).length,
    selected:  rows.filter(o => o.status === 'selected').length,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function OwnerPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = PERIODS.find(p => p.key === periodParam)?.key ?? '30';
  const days   = parseInt(period);

  const { supabase, user } = await getAuth();
  if (!user) redirect('/login');

  const [profileRes, membersRes, myMembershipRes] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('manager_name, plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<ProfilePlanData & { manager_name: string | null }>(),
    supabase
      .from('agency_members')
      .select('member_user_id, invited_email, display_name, status')
      .eq('owner_id', user.id),
    supabase
      .from('agency_members')
      .select('id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  // Team members don't see the owner panel
  if (myMembershipRes.data) redirect('/dashboard');

  const tier       = getEffectivePlan(profileRes.data ?? DEFAULT_PLAN_DATA);
  const hasPanel   = PLANS[tier].features.adminPanel;

  // Plans without the owner panel never see it — not even as a locked page
  if (!hasPanel) redirect('/dashboard');

  // ── People in the agency ─────────────────────────────────────────────────
  const members = ((membersRes.data ?? []) as MemberRow[]).filter(m => m.member_user_id && m.status === 'active');
  const people  = [
    { id: user.id, name: profileRes.data?.manager_name?.trim() || 'Rəhbər', isOwner: true },
    ...members.map(m => ({
      id: m.member_user_id as string,
      name: m.display_name?.trim() || m.invited_email.split('@')[0],
      isOwner: false,
    })),
  ];
  const ids = people.map(p => p.id);
  const nameOf = (id: string) => people.find(p => p.id === id)?.name ?? '—';

  // ── Data: current + previous period, and 8 weeks for the trend ───────────
  const now        = Date.now();
  const since      = new Date(now - Math.max(days * 2, 56) * DAY).toISOString();
  const [{ data: offersData }, { data: remindersData }] = await Promise.all([
    supabase
      .from('offers')
      .select('id, agency_id, created_by, client_name, destination, created_at, views_count, status, customer_response, expires_at, last_viewed_at')
      .in('agency_id', ids)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('reminders')
      .select('manager_id, due_at, done_at')
      .in('manager_id', ids)
      .is('done_at', null)
      .lte('due_at', new Date().toISOString()),
  ]);

  const all      = (offersData ?? []) as OfferRow[];
  const ownerOf  = (o: OfferRow) => o.created_by ?? o.agency_id;
  const curStart = now - days * DAY;
  const prvStart = now - 2 * days * DAY;
  const cur      = all.filter(o => new Date(o.created_at).getTime() >= curStart);
  const prev     = all.filter(o => { const t = new Date(o.created_at).getTime(); return t >= prvStart && t < curStart; });
  const sCur     = statsOf(cur);
  const sPrev    = statsOf(prev);
  const overdue  = (remindersData ?? []) as ReminderRow[];

  // ── Per-manager table ────────────────────────────────────────────────────
  const rows = people.map(p => {
    const mine = cur.filter(o => ownerOf(o) === p.id);
    const s    = statsOf(mine);
    return {
      ...p,
      ...s,
      conversion: pct(s.selected, s.sent),
      overdue:    overdue.filter(r => r.manager_id === p.id).length,
    };
  }).sort((a, b) => b.selected - a.selected || b.sent - a.sent);
  const best = rows.length > 1 ? Math.max(...rows.map(r => r.conversion)) : -1;

  // ── Attention ────────────────────────────────────────────────────────────
  const open     = all.filter(o => o.status !== 'selected' && o.customer_response !== 'not_interested'
                                && !(o.expires_at && new Date(o.expires_at).getTime() < now));
  const hot      = open.filter(o => (o.views_count ?? 0) >= 2 && !o.customer_response);
  const expiring = open.filter(o => o.expires_at && new Date(o.expires_at).getTime() - now < DAY && !o.customer_response);
  const priceHigh = open.filter(o => o.customer_response === 'price_high');
  type Att = { id: string; icon: IconName; title: string; note: string; who: string; danger?: boolean; href?: string };
  const attention: Att[] = [
    ...expiring.map(o => ({ id: o.id, icon: 'clock' as IconName, danger: true, title: `${o.client_name} — ${o.destination}`, note: '24 saat ərzində bitir, cavab yoxdur', who: nameOf(ownerOf(o)) })),
    ...hot.map(o => ({ id: o.id, icon: 'flame' as IconName, title: `${o.client_name} — ${o.destination}`, note: `${o.views_count} dəfə baxılıb, qərar verilməyib`, who: nameOf(ownerOf(o)) })),
    ...priceHigh.map(o => ({ id: o.id, icon: 'tag' as IconName, title: `${o.client_name} — ${o.destination}`, note: 'Qiyməti yüksək tapıb — alternativ göndərin', who: nameOf(ownerOf(o)), href: `/create?from=${o.id}&alt=1` })),
  ].slice(0, 12);

  // ── 8-week trend ─────────────────────────────────────────────────────────
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end   = now - (7 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    const w     = all.filter(o => { const t = new Date(o.created_at).getTime(); return t >= start && t < end; });
    const d     = new Date(start);
    return {
      label:    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
      sent:     w.length,
      selected: w.filter(o => o.status === 'selected').length,
    };
  });
  const maxWeek = Math.max(1, ...weeks.map(w => w.sent));

  // ── Destinations ─────────────────────────────────────────────────────────
  const destMap = new Map<string, { sent: number; selected: number }>();
  for (const o of cur) {
    const k = o.destination?.trim() || 'Digər';
    const v = destMap.get(k) ?? { sent: 0, selected: 0 };
    destMap.set(k, { sent: v.sent + 1, selected: v.selected + (o.status === 'selected' ? 1 : 0) });
  }
  const dests = Array.from(destMap.entries())
    .map(([name, v]) => ({ name, ...v, rate: pct(v.selected, v.sent) }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 8);

  const kpis = [
    { label: 'Göndərilən təklif', cur: sCur.sent,      prev: sPrev.sent },
    { label: 'Baxılıb',           cur: sCur.viewed,    prev: sPrev.viewed },
    { label: 'Rəy bildirib',      cur: sCur.responded, prev: sPrev.responded },
    { label: 'Otel seçib',        cur: sCur.selected,  prev: sPrev.selected },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <PageTitle
        title="Rəhbər paneli"
        subtitle={`Komanda: ${people.length} nəfər · son ${days} gün, əvvəlki ${days} günlə müqayisədə`}
        actions={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {PERIODS.map(p => (
              <Link
                key={p.key}
                href={`/dashboard/rehber?period=${p.key}`}
                className={`px-3 h-8 inline-flex items-center rounded-md text-xs font-medium transition-colors ${
                  period === p.key ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />

      {/* ── KPIs with comparison ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => {
          const d = delta(k.cur, k.prev);
          return (
            <div key={k.label} className="card px-4 py-4">
              <p className="section-title">{k.label}</p>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <p className="text-2xl font-semibold tracking-tight text-ink">{k.cur}</p>
                <span className={`text-xs font-medium ${d.up === null ? 'text-slate-400' : d.up ? 'text-brand-700' : 'text-red-600'}`}>
                  {d.text}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">əvvəlki dövr: {k.prev}</p>
            </div>
          );
        })}
      </div>

      {/* ── Managers table ──────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Menecerlər üzrə nəticələr</h2>
            <p className="text-xs text-slate-500 mt-0.5">Son {days} gün · otel seçiminə görə sıralanıb</p>
          </div>
          <Link href="/dashboard/team" className="btn btn-sm btn-ghost">
            <Icon name="users" className="w-3.5 h-3.5" />
            Komanda
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="font-medium px-5 py-2.5">Menecer</th>
                <th className="font-medium px-3 py-2.5 text-right">Təklif</th>
                <th className="font-medium px-3 py-2.5 text-right">Baxılıb</th>
                <th className="font-medium px-3 py-2.5 text-right">Rəy</th>
                <th className="font-medium px-3 py-2.5 text-right">Seçim</th>
                <th className="font-medium px-3 py-2.5 text-right">Dönüşüm</th>
                <th className="font-medium px-5 py-2.5 text-right">Gecikmiş xatırlatma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center uppercase flex-shrink-0">
                        {r.name.charAt(0)}
                      </span>
                      <span className="text-ink">{r.name}</span>
                      {r.isOwner && <span className="pill pill-neutral">Rəhbər</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.sent}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">{r.viewed}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">{r.responded}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium text-ink">{r.selected}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className={r.conversion === best && r.sent > 0 ? 'text-brand-700 font-medium' : 'text-slate-600'}>
                      {r.conversion}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {r.overdue > 0 ? <span className="pill pill-danger">{r.overdue}</span> : <span className="text-slate-400">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {people.length === 1 && (
          <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">
            Komandanıza menecer əlavə etdikdə onların nəticələri burada müqayisəli görünəcək.{' '}
            <Link href="/dashboard/team" className="text-brand-700 hover:underline">Menecer dəvət et</Link>
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
        {/* ── Attention ──────────────────────────────────────────────────── */}
        <section className="card">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Diqqət tələb edən satışlar</h2>
              <p className="text-xs text-slate-500 mt-0.5">İndi addım atılmasa itirilə bilər</p>
            </div>
            <span className="pill pill-neutral">{attention.length}</span>
          </div>
          {attention.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500 text-center">Hazırda təcili addım tələb edən təklif yoxdur.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.map(a => (
                <li key={`${a.icon}-${a.id}`} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon name={a.icon} className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{a.title}</p>
                    <p className={`text-xs mt-0.5 ${a.danger ? 'text-red-600' : 'text-slate-500'}`}>
                      {a.note} · <span className="text-slate-400">{a.who}</span>
                    </p>
                  </div>
                  {a.href ? (
                    <Link href={a.href} className="btn btn-sm btn-secondary">Alternativ</Link>
                  ) : (
                    <a href={`/offer/${a.id}?preview=1`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost px-2" aria-label="Təklifə bax">
                      <Icon name="eye" className="w-4 h-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* ── Trend ──────────────────────────────────────────────────────── */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Son 8 həftə</h2>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300" />Təklif</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-brand-600" />Seçim</span>
              </div>
            </div>
            <div className="mt-5 flex items-end gap-2 h-32">
              {weeks.map(w => (
                <div key={w.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title={`${w.label}: ${w.sent} təklif, ${w.selected} seçim`}>
                  <div className="w-full flex items-end gap-0.5 h-full">
                    <div className="flex-1 bg-slate-200 rounded-t" style={{ height: `${(w.sent / maxWeek) * 100}%`, minHeight: w.sent ? 3 : 0 }} />
                    <div className="flex-1 bg-brand-600 rounded-t" style={{ height: `${(w.selected / maxWeek) * 100}%`, minHeight: w.selected ? 3 : 0 }} />
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">{w.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Destinations ───────────────────────────────────────────────── */}
          <section className="card">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-ink">İstiqamətlər</h2>
              <p className="text-xs text-slate-500 mt-0.5">Təklif sayı və seçim faizi</p>
            </div>
            {dests.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">Bu dövrdə məlumat yoxdur.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {dests.map(d => (
                  <li key={d.name} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink truncate">{d.name}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0 tabular-nums">
                      {d.sent} təklif · <span className={d.rate > 0 ? 'text-brand-700 font-medium' : ''}>{d.rate}% seçim</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
