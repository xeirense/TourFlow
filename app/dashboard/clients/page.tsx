import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuth } from '@/lib/auth';
import { SOURCE_LABELS, type ClientSource } from '@/lib/types';
import { formatPhone } from '@/lib/phone';
import Icon from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';

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
  decided?: boolean; // selected a hotel or said "not interested"
}

// "Yüksək maraq": opened offers 2+ times but has not decided yet
// (no hotel selected, not declined) — the clients worth calling now.
function isHot(row: ClientRow): boolean {
  return (row.total_views ?? 0) >= 2 && !row.decided;
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

  const { supabase, user } = await getAuth();
  if (!user) redirect('/login');

  // Build query
  let query = supabase
    .from('clients')
    .select('id, full_name, phone, email, tags, source, preferred_destinations, budget_min, budget_max, currency, travelers, assigned_manager_id, created_at, offers(count)')
    .or(`agency_owner_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(100);

  // Strip PostgREST filter syntax characters so user input can't break the filter
  const safeQ = q.replace(/[%,.()\[\]:*]/g, '').trim();
  if (safeQ) query = query.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);
  if (tag) query = query.contains('tags', [tag]);
  if (src) query = query.eq('source', src);

  const { data: rawClients } = await query;
  let clients = (rawClients ?? []) as ClientRow[];

  // Enrich with views data from offers
  if (clients.length > 0) {
    const clientIds = clients.map(c => c.id);
    const { data: offerStats } = await supabase
      .from('offers')
      .select('client_id, views_count, last_viewed_at, status, customer_response')
      .in('client_id', clientIds);

    const statsMap: Record<string, { views: number; lastViewed: string | null; decided: boolean }> = {};
    for (const o of (offerStats ?? [])) {
      if (!o.client_id) continue;
      const existing = statsMap[o.client_id] ?? { views: 0, lastViewed: null, decided: false };
      existing.views += o.views_count ?? 0;
      if (o.status === 'selected' || o.customer_response === 'not_interested') existing.decided = true;
      if (o.last_viewed_at && (!existing.lastViewed || o.last_viewed_at > existing.lastViewed)) {
        existing.lastViewed = o.last_viewed_at;
      }
      statsMap[o.client_id] = existing;
    }

    clients = clients.map(c => ({
      ...c,
      total_views:    statsMap[c.id]?.views ?? 0,
      last_viewed_at: statsMap[c.id]?.lastViewed ?? null,
      decided:        statsMap[c.id]?.decided ?? false,
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

  const chipCls = (active: boolean) =>
    `inline-flex items-center gap-1 h-8 px-3 rounded-full border text-xs font-medium transition-colors ${active ? 'bg-ink text-white border-ink' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-ink'}`;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <PageTitle
        title="Müştərilər"
        subtitle={`${clients.length} müştəri · təklif göndərdikcə kart avtomatik yaranır`}
        actions={
          <a href="/api/clients/export" className="btn btn-sm btn-secondary">
            <Icon name="download" className="w-3.5 h-3.5" />
            CSV ixrac
          </a>
        }
      />

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ad və ya telefon nömrəsi"
            className="input pl-9"
          />
        </div>
        <select
          name="source"
          defaultValue={src}
          aria-label="Müraciət kanalı"
          className="input w-auto pr-8 hidden sm:block"
        >
          <option value="">Bütün kanallar</option>
          {(['whatsapp','instagram','referral','walk-in','other'] as ClientSource[]).map(s => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
        {hot && <input type="hidden" name="hot" value="1" />}
        <button type="submit" className="btn btn-md btn-dark">Axtar</button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Link
          href={buildFilter('hot', hot ? '' : '1')}
          className={chipCls(hot)}
          title="Təklifə 2+ dəfə baxıb, hələ qərar verməyən müştərilər"
        >
          <Icon name="flame" className="w-3.5 h-3.5" />
          Yüksək maraq
        </Link>
        {allTags.slice(0, 8).map(t => (
          <Link key={t} href={buildFilter('tag', tag === t ? '' : t)} className={chipCls(tag === t)}>
            #{t}
          </Link>
        ))}
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="card text-center py-16 px-5">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Icon name="user" className="w-6 h-6" />
          </div>
          <p className="text-ink font-medium text-sm mt-4">Müştəri tapılmadı</p>
          <p className="text-slate-500 text-sm mt-1">Yeni təklif göndərdikdə müştəri kartı avtomatik yaranır.</p>
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {clients.map(c => {
            const isHotClient = isHot(c);
            const offerCount  = c.offers?.[0]?.count ?? 0;
            const travelersText = `${c.travelers.adults} böyük${c.travelers.children > 0 ? `, ${c.travelers.children} uşaq` : ''}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/clients/${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {c.full_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink text-sm">{c.full_name}</span>
                      {isHotClient && (
                        <span className="pill pill-brand">
                          <Icon name="flame" className="w-3 h-3" />
                          Yüksək maraq
                        </span>
                      )}
                      {c.tags.slice(0, 2).map(t => (
                        <span key={t} className="pill pill-neutral">#{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-0.5 mt-0.5 flex-wrap text-xs text-slate-500">
                      {c.phone && <span className="tabular-nums">{formatPhone(c.phone)}</span>}
                      <span>{travelersText}</span>
                      <span>{SOURCE_LABELS[c.source]}</span>
                      {c.preferred_destinations.length > 0 && (
                        <span className="hidden sm:inline">{c.preferred_destinations.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-ink">{offerCount} <span className="text-slate-500 text-xs">təklif</span></p>
                    {(c.total_views ?? 0) > 0 && (
                      <p className="text-xs text-slate-500">{c.total_views} baxış</p>
                    )}
                  </div>

                  <Icon name="chevron" className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
