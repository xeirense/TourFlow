import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  PLANS,
  getEffectivePlan,
  DEFAULT_PLAN_DATA,
  type ProfilePlanData,
} from '@/lib/planConfig';
import LockedCard from '@/app/components/LockedCard';
import type { Hotel } from '@/lib/types';

// ─── Meal / currency label maps ───────────────────────────────────────────────
const MEAL_LABELS: Record<string, string> = {
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
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    .select('id, client_name, destination, views_count, status, customer_response, created_at, last_viewed_at, hotels, selected_hotel, expires_at')
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
  const hotLeads = rows.filter(o =>
    (o.views_count ?? 0) >= 3 &&
    o.customer_response == null &&
    o.status !== 'selected',
  );

  // Said "price too high" — renegotiation opportunity
  const priceHighOffers = rows.filter(o => o.customer_response === 'price_high');

  // Expiring within 72h, has views, not closed
  const expiringOffers = rows.filter(o => {
    if (!o.expires_at) return false;
    const diff = new Date(o.expires_at).getTime() - now.getTime();
    return diff > 0 && diff < 72 * 3_600_000 && (o.views_count ?? 0) > 0 && o.status !== 'selected';
  });

  // Expiring soon but never opened
  const neverViewedExpiring = rows.filter(o => {
    if (!o.expires_at) return false;
    const exp = new Date(o.expires_at);
    return exp > now &&
      (exp.getTime() - now.getTime()) < 72 * 3_600_000 &&
      (o.views_count ?? 0) === 0;
  });

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
    <div className="min-h-screen bg-slate-100">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 -ml-2"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-sm leading-tight">Analitika</h1>
            <p className="text-slate-500 text-xs">Müştəri davranışı və satış analizi</p>
          </div>
          <Link
            href="/create"
            className="bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            + Yeni Təklif
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Period filter ─────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <Link
              key={p.key}
              href={`/dashboard/analytics?period=${p.key}`}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                period === p.key
                  ? 'bg-[#0A0F1E] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Göndərilən Təklif" value={totalOffers}    sub="ədəd"       />
          <KpiCard label="Ümumi Baxış"       value={totalViews}     sub="dəfə"       />
          <KpiCard label="WhatsApp Seçimi"   value={totalSelected}  sub="müştəri"    />
          <KpiCard label="Dönüşüm Nisbəti"   value={`${convRate}%`} sub="baxış→seçim" />
        </div>

        {/* ── Attention Required ────────────────────────────────────────── */}
        {attentionCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h2 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              ⚠️ Diqqət Tələb Edən Təkliflər
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {attentionCount}
              </span>
            </h2>
            <div className="space-y-2.5">
              {hotLeads.map(o => (
                <AttentionItem
                  key={`hot-${o.id}`}
                  id={o.id}
                  label={`🔥 ${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                  note={`${o.views_count} dəfə baxılıb, cavab gözləyir — izlə`}
                  cls="bg-orange-50 border-orange-200 text-orange-800"
                />
              ))}
              {priceHighOffers.map(o => (
                <AttentionItem
                  key={`ph-${o.id}`}
                  id={o.id}
                  label={`💬 ${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                  note="Müştəri qiyməti yüksək tapdı — alternativ təklif yarat"
                  cls="bg-yellow-50 border-yellow-200 text-yellow-800"
                  actionHref={`/create?from=${o.id}&alt=1`}
                  actionLabel="↩ Alternativ"
                />
              ))}
              {expiringOffers.map(o => (
                <AttentionItem
                  key={`exp-${o.id}`}
                  id={o.id}
                  label={`⏰ ${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                  note="72 saata bitəcək — müştəri baxıb amma qərar verməyib"
                  cls="bg-red-50 border-red-200 text-red-800"
                />
              ))}
              {neverViewedExpiring.map(o => (
                <AttentionItem
                  key={`nv-${o.id}`}
                  id={o.id}
                  label={`📭 ${o.destination}${o.client_name ? ` — ${o.client_name}` : ''}`}
                  note="Heç açılmayıb və bitmək üzrədir — linki yenidən göndər"
                  cls="bg-slate-100 border-slate-300 text-slate-700"
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Conversion Funnel ─────────────────────────────────────────── */}
        {hasFullAnalytics ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-1">Satış Hunisi</h2>
            <p className="text-xs text-slate-400 mb-4">Hər addımda neçə müştəri qaldı</p>
            {totalOffers === 0 ? (
              <p className="text-slate-400 text-sm">Bu dövrdə məlumat yoxdur.</p>
            ) : (
              <div className="space-y-4">
                <FunnelStep step={1} label="Göndərilən Təklif"          count={totalOffers}   total={totalOffers} color="bg-slate-400"  />
                <FunnelStep step={2} label="Baxılmış (≥1 baxış)"        count={viewed}        total={totalOffers} color="bg-blue-400"   />
                <FunnelStep step={3} label="Rəy Bildirmiş"              count={responded}     total={totalOffers} color="bg-teal-500"   />
                <FunnelStep step={4} label="WhatsApp Seçimi (Bağlandı)" count={totalSelected} total={totalOffers} color="bg-green-500" />
                {avgHoursToView !== null && (
                  <p className="text-xs text-slate-400 pt-1 border-t border-slate-50">
                    ⏱ Ortalama ilk baxış vaxtı:{' '}
                    <span className="font-semibold text-slate-600">{avgHoursToView} saat</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <LockedCard requiredPlan="growth" title="Satış Hunisi" heightCls="h-48" />
        )}

        {/* ── Revenue Pipeline ──────────────────────────────────────────── */}
        {hasFullAnalytics ? (
          pipelineCount > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-800 mb-1">Gəlir Boru Xətti</h2>
              <p className="text-xs text-slate-400 mb-4">
                {pipelineCount} seçilmiş təklifin ümumi dəyəri
              </p>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(pipeline).map(([currency, total]) =>
                  total > 0 ? (
                    <div key={currency} className="text-center bg-teal-50 border border-teal-100 rounded-2xl p-4">
                      <p className="text-xl font-extrabold text-teal-700">
                        {CURRENCY_SYMBOLS[currency]}{total.toLocaleString('az-AZ')}
                      </p>
                      <p className="text-xs text-teal-600 font-semibold mt-0.5">{currency}</p>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          ) : null
        ) : (
          <LockedCard requiredPlan="growth" title="Gəlir Boru Xətti" heightCls="h-36" />
        )}

        {/* ── Customer Response Breakdown ───────────────────────────────── */}
        {hasFullAnalytics ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4">Müştəri Rəyləri</h2>
            {(interested + priceHigh + notInterested) === 0 ? (
              <p className="text-slate-400 text-sm">Bu dövrdə heç bir müştəri rəy bildiribməyib.</p>
            ) : (
              <div className="space-y-3.5">
                <ResponseRow label="✅ Maraqlandı"       count={interested}    total={totalOffers} color="bg-teal-500"  />
                <ResponseRow label="💬 Qiymət yüksəkdir" count={priceHigh}     total={totalOffers} color="bg-amber-400" />
                <ResponseRow label="❌ Maraqlanmadı"     count={notInterested} total={totalOffers} color="bg-red-400"   />
                <ResponseRow label="⏳ Cavabsız"         count={noResponse}    total={totalOffers} color="bg-slate-200" />
              </div>
            )}
          </div>
        ) : (
          <LockedCard requiredPlan="growth" title="Müştəri Rəyləri Analizi" heightCls="h-40" />
        )}

        {/* ── Hotel Preferences ─────────────────────────────────────────── */}
        {totalHotels > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-1">Otel Üstünlükləri</h2>
            <p className="text-xs text-slate-400 mb-4">
              {totalHotels} otel variantı analizi
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Stars distribution */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Ulduz Kateqoriyası
                </p>
                <div className="space-y-3">
                  {([5, 4, 3] as const).map(s => (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">
                          {'★'.repeat(s)} {s} Ulduz
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {starCounts[s] ?? 0}{' '}
                          <span className="text-slate-400 font-normal">
                            ({pct(starCounts[s] ?? 0, totalHotels)}%)
                          </span>
                        </span>
                      </div>
                      <Bar
                        pct={pct(starCounts[s] ?? 0, totalHotels)}
                        color={s === 5 ? 'bg-amber-400' : s === 4 ? 'bg-teal-500' : 'bg-slate-400'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Meal type distribution */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  Qidalanma Növü
                </p>
                <div className="space-y-3">
                  {topMeals.map(([meal, count]) => (
                    <div key={meal}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">
                          {MEAL_LABELS[meal] ?? meal}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {count}{' '}
                          <span className="text-slate-400 font-normal">
                            ({pct(count, totalHotels)}%)
                          </span>
                        </span>
                      </div>
                      <Bar pct={pct(count, totalHotels)} color="bg-indigo-400" />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Top Destinations ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Ən Populyar İstiqamətlər</h2>
          {topDests.length === 0 ? (
            <p className="text-slate-400 text-sm">Bu dövrdə məlumat yoxdur.</p>
          ) : (
            <div className="space-y-4">
              {topDests.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-800 text-sm">{d.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{d.count} təklif</span>
                      <span className="font-semibold text-slate-600">{d.views} baxış</span>
                    </div>
                  </div>
                  <Bar pct={pct(d.views, maxDestViews)} color="bg-teal-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Offer activity list ───────────────────────────────────────── */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Tekliflər</h2>
              <span className="text-xs text-slate-400">{rows.length} ədəd</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {rows.slice(0, 20).map(o => (
                <li key={o.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {o.destination}
                      {o.client_name ? ` — ${o.client_name}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString('az-AZ')}
                      {o.last_viewed_at && (
                        <>
                          {' · '}Son baxış:{' '}
                          {new Date(o.last_viewed_at).toLocaleDateString('az-AZ')}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    <span className="text-slate-500">👁 {o.views_count ?? 0}</span>
                    {o.customer_response === 'interested'     && <span className="text-teal-600 font-semibold">✅</span>}
                    {o.customer_response === 'price_high'     && <span className="text-amber-500 font-semibold">💬</span>}
                    {o.customer_response === 'not_interested' && <span className="text-red-400 font-semibold">❌</span>}
                    {o.status === 'selected' && (
                      <span className="bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full font-semibold">
                        Seçildi
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function FunnelStep({
  step,
  label,
  count,
  total,
  color,
}: {
  step: number;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const p = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold`}
      >
        {step}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="text-sm font-bold text-slate-800">
            {count}{' '}
            <span className="text-xs text-slate-400 font-normal">({p}%)</span>
          </span>
        </div>
        <Bar pct={p} color={color} />
      </div>
    </div>
  );
}

function AttentionItem({
  id,
  label,
  note,
  cls,
  actionHref,
  actionLabel,
}: {
  id: string;
  label: string;
  note: string;
  cls: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${cls}`}>
      <Link
        href={`/offer/${id}`}
        target="_blank"
        className="flex-1 min-w-0 hover:opacity-90 transition-opacity"
      >
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs opacity-70 mt-0.5">{note}</p>
      </Link>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            {actionLabel}
          </Link>
        )}
        <span className="text-xs opacity-40">→</span>
      </div>
    </div>
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
        <span className="text-sm text-slate-700 font-medium">{label}</span>
        <span className="text-sm font-bold text-slate-800">
          {count}{' '}
          <span className="text-slate-400 font-normal text-xs">({p}%)</span>
        </span>
      </div>
      <Bar pct={p} color={color} />
    </div>
  );
}
