import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuth } from '@/lib/auth';
import {
  PLANS,
  getEffectivePlan,
  DEFAULT_PLAN_DATA,
  type ProfilePlanData,
} from '@/lib/planConfig';
import LockedCard from '@/app/components/LockedCard';
import Icon from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';
import type { Hotel } from '@/lib/types';

// ─── Meal / currency label maps ───────────────────────────────────────────────
const MEAL_LABELS: Record<string, string> = {
  RO:  'Yalnız otaq (RO)',
  BB:  'Səhər yeməyi (BB)',
  HB:  'Yarım pansion (HB)',
  FB:  'Tam pansion (FB)',
  AI:  'Hər şey daxil (AI)',
  UAI: 'Ultra hər şey daxil (UAI)',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  AZN: '₼',
  USD: '$',
  EUR: '€',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface OfferRow {
  id: string;
  client_name: string | null;
  destination: string;
  views_count: number | null;
  status: string | null;
  customer_response: string | null;
  created_at: string;
  last_viewed_at: string | null;
  hotels: Hotel[] | null;
  selected_hotel: string | null;
  expires_at: string | null;
  parent_offer_id?: string | null;
}

// ─── Period helpers ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7',   label: 'Son 7 gün' },
  { key: '30',  label: 'Son 30 gün' },
  { key: '365', label: 'Son 1 il' },
  { key: 'all', label: 'Hamısı' },
] as const;

type PeriodKey = typeof PERIODS[number]['key'];

function getSince(period: PeriodKey): Date | null {
  if (period === 'all') return null;
  return new Date(Date.now() - parseInt(period) * 86_400_000);
}

// ─── Shared Bar ───────────────────────────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { supabase, user } = await getAuth();
  if (!user) redirect('/login');

  const { period: rawPeriod } = await searchParams;
  const period: PeriodKey =
    rawPeriod === '7' || rawPeriod === '30' || rawPeriod === '365' || rawPeriod === 'all'
      ? rawPeriod : '30';

  // ── Plan check ─────────────────────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from('agency_profiles')
    .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
    .eq('id', user.id)
    .maybeSingle<ProfilePlanData>();

  const effectiveTier  = getEffectivePlan(profileData ?? DEFAULT_PLAN_DATA);
  const planFeatures   = PLANS[effectiveTier].features;
  const hasFullAnalytics = planFeatures.fullAnalytics;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  let query = supabase
    .from('offers')
    .select('id, client_name, destination, views_count, status, customer_response, created_at, last_viewed_at, hotels, selected_hotel, expires_at, parent_offer_id')
    .eq('agency_id', user.id)
    .order('created_at', { ascending: false });

  const since = getSince(period);
  if (since) query = query.gte('created_at', since.toISOString());

  const { data: offers } = await query;
  const rows: OfferRow[] = (offers ?? []) as OfferRow[];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalOffers   = rows.length;
  const totalViews    = rows.reduce((s, o) => s + (o.views_count ?? 0), 0);
  const totalSelected = rows.filter(o => o.status === 'selected').length;
  const convRate      = totalViews > 0 ? Math.round((totalSelected / totalViews) * 100) : 0;

  // ── Conversion Funnel ─────────────────────────────────────────────────────
  const viewed    = rows.filter(o => (o.views_count ?? 0) > 0).length;
  const responded = rows.filter(o => o.customer_response != null).length;

  // ── Customer responses ────────────────────────────────────────────────────
  const interested    = rows.filter(o => o.customer_response === 'interested').length;
  const priceHigh     = rows.filter(o => o.customer_response === 'price_high').length;
  const notInterested = rows.filter(o => o.customer_response === 'not_interested').length;
  const noResponse    = totalOffers - responded;

  function pct(n: number, total: number) {
    return total > 0 ? Math.round((n / total) * 100) : 0;
  }

  // ── Attention Required / Hot Leads ────────────────────────────────────────
  const now = new Date();

  // Viewed 3+ times, no response, not closed
  // Each offer appears once, under its most urgent reason (expiring → hot → price → unseen)
  const DAY_MS     = 86_400_000;
  const isOpen     = (o: OfferRow) => o.status !== 'selected' && o.customer_response !== 'not_interested';
  const expiresIn  = (o: OfferRow) => (o.expires_at ? new Date(o.expires_at).getTime() - now.getTime() : Infinity);
  const shown      = new Set<string>();
  const take       = (list: OfferRow[]) => list.filter(o => (shown.has(o.id) ? false : (shown.add(o.id), true)));
  const hasAlt     = new Set(rows.map(o => o.parent_offer_id).filter(Boolean) as string[]);

  // Viewed, no decision, expires within 24h
  const expiringOffers = take(rows.filter(o =>
    isOpen(o) && (o.views_count ?? 0) > 0 && expiresIn(o) > 0 && expiresIn(o) < DAY_MS && o.customer_response == null));
  // Opened 3+ times, no answer yet
  const hotLeads = take(rows.filter(o =>
    isOpen(o) && (o.views_count ?? 0) >= 3 && o.customer_response == null && expiresIn(o) > 0));
  // "Price is high" and no cheaper alternative sent yet
  const priceHighOffers = take(rows.filter(o =>
    o.customer_response === 'price_high' && !hasAlt.has(o.id) && expiresIn(o) > 0));
  // Never opened and expires within 24h
  const neverViewedExpiring = take(rows.filter(o =>
    isOpen(o) && (o.views_count ?? 0) === 0 && expiresIn(o) > 0 && expiresIn(o) < DAY_MS));

  const attentionCount =
    hotLeads.length + priceHighOffers.length + expiringOffers.length + neverViewedExpiring.length;

  // ── Hotel Preferences ─────────────────────────────────────────────────────
  const allHotels: Hotel[] = rows.flatMap(o => o.hotels ?? []);
  const starCounts: Record<number, number> = { 3: 0, 4: 0, 5: 0 };
  const mealCounts: Record<string, number> = {};

  for (const h of allHotels) {
    if (h.stars) starCounts[h.stars] = (starCounts[h.stars] ?? 0) + 1;
    if (h.mealType) mealCounts[h.mealType] = (mealCounts[h.mealType] ?? 0) + 1;
  }
  const totalHotels = allHotels.length;
  const topMeals    = Object.entries(mealCounts).sort((a, b) => b[1] - a[1]);

  // ── Revenue Pipeline (selected offers only) ───────────────────────────────
  const pipeline: Record<string, number> = { AZN: 0, USD: 0, EUR: 0 };
  let pipelineCount = 0;

  for (const o of rows) {
    if (o.status === 'selected' && o.selected_hotel && o.hotels) {
      const hotel = o.hotels.find(h => h.name === o.selected_hotel);
      if (hotel?.price && hotel?.currency) {
        pipeline[hotel.currency] = (pipeline[hotel.currency] ?? 0) + hotel.price;
        pipelineCount++;
      }
    }
  }

  // ── Avg time to first view ────────────────────────────────────────────────
  const viewedWithTime = rows.filter(
    o => o.last_viewed_at && (o.views_count ?? 0) > 0,
  );
  const avgHoursToView =
    viewedWithTime.length > 0
      ? Math.round(
          viewedWithTime.reduce((sum, o) => {
            const created = new Date(o.created_at).getTime();
            const firstView = new Date(o.last_viewed_at!).getTime();
            return sum + (firstView - created) / 3_600_000;
          }, 0) / viewedWithTime.length,
        )
      : null;

  // ── Top destinations ──────────────────────────────────────────────────────
  const destMap = new Map<string, { views: number; count: number }>();
  for (const o of rows) {
    const dest = o.destination?.trim() || 'Digər';
    const cur  = destMap.get(dest) ?? { views: 0, count: 0 };
    destMap.set(dest, { views: cur.views + (o.views_count ?? 0), count: cur.count + 1 });
  }
  const topDests = Array.from(destMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const maxDestViews = topDests[0]?.views ?? 1;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <PageTitle
        title="Analitika"
        subtitle="Müştəri davranışı və satış nəticələri"
        actions={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {PERIODS.map(p => (
              <Link
                key={p.key}
                href={`/dashboard/analytics?period=${p.key}`}
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

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Göndərilən təklif" value={totalOffers}    sub="ədəd" />
        <KpiCard label="Ümumi baxış"       value={totalViews}     sub="dəfə" />
        <KpiCard label="Otel seçimi"       value={totalSelected}  sub="müştəri" />
        <KpiCard label="Dönüşüm"           value={`${convRate}%`} sub="baxışdan seçimə" accent />
      </div>

      {/* ── Attention Required ────────────────────────────────────────── */}
      {attentionCount > 0 && (
        <Card
          title="Diqqət tələb edir"
          subtitle="Bu təkliflərdə indi addım atmaq satışı xilas edə bilər"
          badge={attentionCount}
          flush
        >
          <ul className="divide-y divide-slate-100">
            {hotLeads.map(o => (
              <AttentionItem key={`hot-${o.id}`} id={o.id} icon="flame"
                label={`${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                note={`${o.views_count} dəfə baxılıb, cavab yoxdur — əlaqə saxlayın`} />
            ))}
            {priceHighOffers.map(o => (
              <AttentionItem key={`ph-${o.id}`} id={o.id} icon="tag"
                label={`${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                note="Qiyməti yüksək tapıb — ucuz alternativ göndərin"
                actionHref={`/create?from=${o.id}&alt=1`} actionLabel="Alternativ" />
            ))}
            {expiringOffers.map(o => (
              <AttentionItem key={`exp-${o.id}`} id={o.id} icon="clock" danger
                label={`${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                note="24 saat ərzində bitir — baxılıb, qərar yoxdur" />
            ))}
            {neverViewedExpiring.map(o => (
              <AttentionItem key={`nv-${o.id}`} id={o.id} icon="inbox"
                label={`${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                note="Heç açılmayıb və bitmək üzrədir — linki yenidən göndərin" />
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Conversion Funnel ─────────────────────────────────────────── */}
        {hasFullAnalytics ? (
          <Card title="Satış hunisi" subtitle="Hər mərhələdə neçə müştəri qaldı">
            {totalOffers === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-4">
                <FunnelStep step={1} label="Göndərilib"      count={totalOffers}   total={totalOffers} />
                <FunnelStep step={2} label="Baxılıb"         count={viewed}        total={totalOffers} />
                <FunnelStep step={3} label="Rəy bildirib"    count={responded}     total={totalOffers} />
                <FunnelStep step={4} label="Otel seçib"      count={totalSelected} total={totalOffers} strong />
                {avgHoursToView !== null && (
                  <p className="text-xs text-slate-500 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                    <Icon name="clock" className="w-3.5 h-3.5 text-slate-400" />
                    İlk baxışa qədər orta vaxt:
                    <span className="font-medium text-ink">{avgHoursToView} saat</span>
                  </p>
                )}
              </div>
            )}
          </Card>
        ) : (
          <LockedCard requiredPlan="growth" title="Satış hunisi" heightCls="h-48" />
        )}

        {/* ── Customer Response Breakdown ───────────────────────────────── */}
        {hasFullAnalytics ? (
          <Card title="Müştəri rəyləri" subtitle="Təklifə verilən cavablar">
            {(interested + priceHigh + notInterested) === 0 ? (
              <Empty text="Bu dövrdə müştərilər hələ rəy bildirməyib." />
            ) : (
              <div className="space-y-4">
                <ResponseRow label="Maraqlanır"        count={interested}    total={totalOffers} color="bg-brand-600" />
                <ResponseRow label="Qiymət yüksəkdir"  count={priceHigh}     total={totalOffers} color="bg-slate-500" />
                <ResponseRow label="Maraqlanmır"       count={notInterested} total={totalOffers} color="bg-slate-300" />
                <ResponseRow label="Cavab verməyib"    count={noResponse}    total={totalOffers} color="bg-slate-200" />
              </div>
            )}
          </Card>
        ) : (
          <LockedCard requiredPlan="growth" title="Müştəri rəyləri" heightCls="h-40" />
        )}
      </div>

      {/* ── Revenue Pipeline ──────────────────────────────────────────── */}
      {hasFullAnalytics ? (
        pipelineCount > 0 ? (
          <Card title="Seçilmiş təkliflərin dəyəri" subtitle={`${pipelineCount} seçilmiş təklif üzrə`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(pipeline).map(([currency, total]) =>
                total > 0 ? (
                  <div key={currency} className="rounded-lg border border-slate-200 px-4 py-3">
                    <p className="section-title">{currency}</p>
                    <p className="text-xl font-semibold text-ink mt-1 tracking-tight">
                      {CURRENCY_SYMBOLS[currency]}{total.toLocaleString('az-AZ')}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </Card>
        ) : null
      ) : (
        <LockedCard requiredPlan="growth" title="Seçilmiş təkliflərin dəyəri" heightCls="h-36" />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Top Destinations ──────────────────────────────────────────── */}
        <Card title="Populyar istiqamətlər" subtitle="Baxış sayına görə">
          {topDests.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-4">
              {topDests.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1.5 gap-3">
                    <span className="text-sm text-ink truncate">{d.name}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {d.count} təklif · <span className="text-ink font-medium">{d.views} baxış</span>
                    </span>
                  </div>
                  <Bar pct={pct(d.views, maxDestViews)} color="bg-brand-600" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Hotel Preferences ─────────────────────────────────────────── */}
        {totalHotels > 0 ? (
          <Card title="Otel üstünlükləri" subtitle={`${totalHotels} otel variantı üzrə`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="section-title mb-3">Ulduz</p>
                <div className="space-y-3">
                  {([5, 4, 3] as const).map(s => (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">{s} ulduz</span>
                        <span className="text-xs text-slate-500">
                          {starCounts[s] ?? 0} · {pct(starCounts[s] ?? 0, totalHotels)}%
                        </span>
                      </div>
                      <Bar pct={pct(starCounts[s] ?? 0, totalHotels)} color="bg-ink" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="section-title mb-3">Qidalanma</p>
                <div className="space-y-3">
                  {topMeals.map(([meal, count]) => (
                    <div key={meal}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm text-slate-700 truncate">{MEAL_LABELS[meal] ?? meal}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {count} · {pct(count, totalHotels)}%
                        </span>
                      </div>
                      <Bar pct={pct(count, totalHotels)} color="bg-ink" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Otel üstünlükləri"><Empty /></Card>
        )}
      </div>

      {/* ── Offer activity list ───────────────────────────────────────── */}
      {rows.length > 0 && (
        <Card title="Təkliflər üzrə fəaliyyət" badge={rows.length} flush>
          <ul className="divide-y divide-slate-100">
            {rows.slice(0, 20).map(o => (
              <li key={o.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">
                    {o.destination}
                    {o.client_name ? <span className="text-slate-500"> — {o.client_name}</span> : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString('az-AZ')}
                    {o.last_viewed_at && <> · son baxış {new Date(o.last_viewed_at).toLocaleDateString('az-AZ')}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Icon name="eye" className="w-3.5 h-3.5" />
                    {o.views_count ?? 0}
                  </span>
                  {o.status === 'selected' ? (
                    <span className="pill pill-strong">Seçildi</span>
                  ) : o.customer_response === 'interested' ? (
                    <span className="pill pill-brand">Maraqlanır</span>
                  ) : o.customer_response === 'price_high' ? (
                    <span className="pill pill-neutral">Qiymət yüksəkdir</span>
                  ) : o.customer_response === 'not_interested' ? (
                    <span className="pill pill-neutral text-slate-400">Maraqlanmır</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  badge,
  flush,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: number;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge !== undefined && <span className="pill pill-neutral">{badge}</span>}
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

function Empty({ text = 'Bu dövrdə məlumat yoxdur.' }: { text?: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="card px-4 py-4">
      <p className="section-title">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight mt-2 ${accent ? 'text-brand-700' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function FunnelStep({
  step,
  label,
  count,
  total,
  strong,
}: {
  step: number;
  label: string;
  count: number;
  total: number;
  strong?: boolean;
}) {
  const p = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center ${
        strong ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}>
        {step}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-700">{label}</span>
          <span className="text-sm font-medium text-ink">
            {count} <span className="text-xs text-slate-400 font-normal">· {p}%</span>
          </span>
        </div>
        <Bar pct={p} color={strong ? 'bg-brand-600' : 'bg-slate-400'} />
      </div>
    </div>
  );
}

function AttentionItem({
  id,
  icon,
  label,
  note,
  danger,
  actionHref,
  actionLabel,
}: {
  id: string;
  icon: 'flame' | 'tag' | 'clock' | 'inbox';
  label: string;
  note: string;
  danger?: boolean;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        danger ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
      }`}>
        <Icon name={icon} className="w-4 h-4" />
      </span>
      <Link href={`/offer/${id}?preview=1`} target="_blank" className="flex-1 min-w-0 group">
        <p className="text-sm text-ink truncate group-hover:text-brand-700">{label}</p>
        <p className={`text-xs mt-0.5 ${danger ? 'text-red-600' : 'text-slate-500'}`}>{note}</p>
      </Link>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-sm btn-secondary">
          <Icon name="repeat" className="w-3.5 h-3.5" />
          {actionLabel}
        </Link>
      ) : (
        <Icon name="chevron" className="w-4 h-4 text-slate-300 flex-shrink-0" />
      )}
    </li>
  );
}

function ResponseRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const p = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-700">{label}</span>
        <span className="text-sm font-medium text-ink">
          {count} <span className="text-slate-400 font-normal text-xs">· {p}%</span>
        </span>
      </div>
      <Bar pct={p} color={color} />
    </div>
  );
}
