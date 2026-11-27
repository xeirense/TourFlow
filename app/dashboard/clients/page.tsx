import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { SOURCE_LABELS, type ClientSource } from '@/lib/types';

interface ClientRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  tags: string[];
  source: ClientSource;
  preferred_destinations: string[];
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  travelers: { adults: number; children: number };
  assigned_manager_id: string | null;
  created_at: string;
  offers: { count: number }[];
  // Joined (via offers)
  last_viewed_at?: string | null;
  total_views?: number;
}

function isHot(row: ClientRow): boolean {
  // "Hot" = ≥2 total views, no offer yet selected (heuristic from offer data)
  return (row.total_views ?? 0) >= 2;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp  = await searchParams;
  const q   = sp.q   ?? '';
  const tag = sp.tag ?? '';
  const src = sp.source ?? '';
  const hot = sp.hot === '1';

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Build query
  let query = supabase
    .from('clients')
    .select('id, full_name, phone, email, tags, source, preferred_destinations, budget_min, budget_max, currency, travelers, assigned_manager_id, created_at, offers(count)')
    .or(`agency_owner_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (q)   query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (tag) query = query.contains('tags', [tag]);
  if (src) query = query.eq('source', src);

  const { data: rawClients } = await query;
  let clients = (rawClients ?? []) as ClientRow[];

  // Enrich with views data from offers
  if (clients.length > 0) {
    const clientIds = clients.map(c => c.id);
    const { data: offerStats } = await supabase
      .from('offers')
      .select('client_id, views_count, last_viewed_at')
      .in('client_id', clientIds);

    const statsMap: Record<string, { views: number; lastViewed: string | null }> = {};
    for (const o of (offerStats ?? [])) {
      if (!o.client_id) continue;
      const existing = statsMap[o.client_id] ?? { views: 0, lastViewed: null };
      existing.views += o.views_count ?? 0;
      if (o.last_viewed_at && (!existing.lastViewed || o.last_viewed_at > existing.lastViewed)) {
        existing.lastViewed = o.last_viewed_at;
      }
      statsMap[o.client_id] = existing;
    }

    clients = clients.map(c => ({
      ...c,
      total_views:    statsMap[c.id]?.views ?? 0,
      last_viewed_at: statsMap[c.id]?.lastViewed ?? null,
    }));
  }

  if (hot) clients = clients.filter(isHot);

  // Collect all unique tags for filter chips
  const allTags = Array.from(new Set(clients.flatMap(c => c.tags)));

  function buildFilter(key: string, val: string) {
    const params = new URLSearchParams({ q, tag, source: src, hot: hot ? '1' : '' });
    params.set(key, val);
    if (!val) params.delete(key);
    if (!params.get('hot')) params.delete('hot');
    return `/dashboard/clients?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xl">←</Link>
          <div className="flex-1">
            <h1 className="font-bold text-base">Müştəri Bazası</h1>
            <p className="text-slate-500 text-xs">{clients.length} müştəri</p>
          </div>
          <a
            href="/api/clients/export"
            className="text-xs text-teal-400 hover:text-teal-300 border border-teal-500/30 rounded-lg px-3 py-1.5 transition-colors hidden sm:block"
          >
            ⬇ CSV
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* Search + filter bar */}
        <form method="GET" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ad və ya telefon axtar..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            Axtar
          </button>
        </form>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <Link
            href={buildFilter('hot', hot ? '' : '1')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              hot ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-red-400'
            }`}
          >
            🔥 İsti müştərilər
          </Link>
          {(['whatsapp','instagram','referral','walk-in','other'] as ClientSource[]).map(s => (
            <Link
              key={s}
              href={buildFilter('source', src === s ? '' : s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                src === s ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
              }`}
            >
              {SOURCE_LABELS[s]}
            </Link>
          ))}
          {allTags.slice(0, 8).map(t => (
            <Link
              key={t}
              href={buildFilter('tag', tag === t ? '' : t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                tag === t ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
              }`}
            >
              #{t}
            </Link>
          ))}
        </div>

        {/* Client list */}
        {clients.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-slate-500 text-sm">Müştəri tapılmadı</p>
            <p className="text-slate-400 text-xs mt-1">
              Yeni təklif göndərdikdə müştərilər avtomatik yaradılır
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {clients.map(c => {
              const hot = isHot(c);
              const offerCount = c.offers?.[0]?.count ?? 0;
              const travelersText = `${c.travelers.adults} böyük${c.travelers.children > 0 ? `, ${c.travelers.children} uşaq` : ''}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 px-4 py-3.5 hover:shadow-sm hover:border-slate-200 transition-all group"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      hot ? 'bg-red-100 text-red-600' : 'bg-teal-50 text-teal-700'
                    }`}>
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">{c.full_name}</span>
                        {hot && (
                          <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">🔥 İSTİ</span>
                        )}
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{SOURCE_LABELS[c.source]}</span>
                        {c.tags.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">#{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                        <span className="text-xs text-slate-400">{travelersText}</span>
                        {c.preferred_destinations.length > 0 && (
                          <span className="text-xs text-slate-400 hidden sm:block">
                            {c.preferred_destinations.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-700">{offerCount} təklif</p>
                      {(c.total_views ?? 0) > 0 && (
                        <p className="text-xs text-slate-400">{c.total_views} baxış</p>
                      )}
                    </div>

                    <span className="text-slate-300 group-hover:text-slate-500 transition-colors text-sm">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
