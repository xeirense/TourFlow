import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OfferRow {
  id: string;
  destination: string;
  views_count: number | null;
  status: string | null;
  customer_response: string | null;
  created_at: string;
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
  const days = parseInt(period);
  return new Date(Date.now() - days * 86_400_000);
}

// ─── Bar component ────────────────────────────────────────────────────────────
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
      ? rawPeriod
      : '30';

  // ── Fetch all offers for this agency ──────────────────────────────────────
  let query = supabase
    .from('offers')
    .select('id, destination, views_count, status, customer_response, created_at')
    .eq('agency_id', user.id)
    .order('created_at', { ascending: false });

  const since = getSince(period);
  if (since) query = query.gte('created_at', since.toISOString());

  const { data: offers } = await query;
  const rows: OfferRow[] = offers ?? [];

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalOffers   = rows.length;
  const totalViews    = rows.reduce((s, o) => s + (o.views_count ?? 0), 0);
  const totalSelected = rows.filter(o => o.status === 'selected').length;
  const convRate      = totalViews > 0 ? Math.round((totalSelected / totalViews) * 100) : 0;

  const interested    = rows.filter(o => o.customer_response === 'interested').length;
  const priceHigh     = rows.filter(o => o.customer_response === 'price_high').length;
  const notInterested = rows.filter(o => o.customer_response === 'not_interested').length;
  const responded     = interested + priceHigh + notInterested;
  const noResponse    = totalOffers - responded;

  function pct(n: number, total: number) {
    return total > 0 ? Math.round((n / total) * 100) : 0;
  }

  // ── Top destinations ──────────────────────────────────────────────────────
  const destMap = new Map<string, { views: number; count: number }>();
  for (const o of rows) {
    const dest    = o.destination?.trim() || 'Digər';
    const current = destMap.get(dest) ?? { views: 0, count: 0 };
    destMap.set(dest, {
      views: current.views + (o.views_count ?? 0),
      count: current.count + 1,
    });
  }
  const topDests = Array.from(destMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const maxDestViews = topDests[0]?.views ?? 1;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 -ml-2"
            aria-label="Dashboard-a qayıt"
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
          <KpiCard label="Göndərilən Təklif" value={totalOffers}         sub="ədəd"  />
          <KpiCard label="Ümumi Baxış"       value={totalViews}          sub="dəfə"  />
          <KpiCard label="WhatsApp Seçimi"   value={totalSelected}       sub="müştəri" />
          <KpiCard label="Dönüşüm Nisbəti"   value={`${convRate}%`}      sub="baxış→seçim" />
        </div>

        {/* ── Customer response breakdown ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Müştəri Rəyləri</h2>
          {responded === 0 ? (
            <p className="text-slate-400 text-sm">Bu dövrdə heç bir müştəri rəy bildiribməyib.</p>
          ) : (
            <div className="space-y-3.5">
              <ResponseRow
                label="✅ Maraqlandı"
                count={interested}
                total={totalOffers}
                color="bg-teal-500"
              />
              <ResponseRow
                label="💬 Qiymət yüksəkdir"
                count={priceHigh}
                total={totalOffers}
                color="bg-amber-400"
              />
              <ResponseRow
                label="❌ Maraqlanmadı"
                count={notInterested}
                total={totalOffers}
                color="bg-red-400"
              />
              <ResponseRow
                label="⏳ Cavabsız"
                count={noResponse}
                total={totalOffers}
                color="bg-slate-200"
              />
            </div>
          )}
        </div>

        {/* ── Top destinations ──────────────────────────────────────────── */}
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
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString('az-AZ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-shrink-0">
                    <span className="text-slate-500">👁 {o.views_count ?? 0}</span>
                    {o.customer_response === 'interested' && (
                      <span className="text-teal-600 font-semibold">✅</span>
                    )}
                    {o.customer_response === 'price_high' && (
                      <span className="text-amber-500 font-semibold">💬</span>
                    )}
                    {o.customer_response === 'not_interested' && (
                      <span className="text-red-400 font-semibold">❌</span>
                    )}
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
