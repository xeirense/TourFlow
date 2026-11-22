import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import CopyButton from './CopyButton';
import LogoutButton from './LogoutButton';

// ─── Row type from offers table ───────────────────────────────────────────────
interface OfferRow {
  id: string;
  client_name: string;
  destination: string;
  date_range: string;
  nights: number;
  hotels: { name: string }[];
  created_at: string;
  views_count: number | null;
  selected_hotel: string | null;
  status: string | null;
}

// ─── Profile type ─────────────────────────────────────────────────────────────
interface AgencyProfile {
  id: string;
  agency_name: string | null;
  agency_logo: string | null;
  whatsapp: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Use SSR supabase client so JWT is forwarded → auth.uid() works in RLS
  const [profileResult, offersResult] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('id, agency_name, agency_logo, whatsapp')
      .eq('id', user.id)
      .single<AgencyProfile>(),
    supabase
      .from('offers')
      .select('id, client_name, destination, date_range, nights, hotels, created_at, views_count, selected_hotel, status')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const profile: AgencyProfile | null = profileResult.data;
  const offers: OfferRow[] = offersResult.data ?? [];

  const agencyLabel = profile?.agency_name ?? user.email ?? 'Agentlik';
  const totalViews  = offers.reduce((sum, o) => sum + (o.views_count ?? 0), 0);
  const totalSelected = offers.filter(o => o.status === 'selected').length;

  // Build absolute base URL — env var takes priority, then derive from request host
  const reqHeaders = await headers();
  const host  = reqHeaders.get('host') ?? '';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${proto}://${host}` : '');

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-[#0F172A] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-base">✈️</div>
          <div className="flex-1">
            <h1 className="font-bold text-sm leading-tight">{agencyLabel}</h1>
            <p className="text-slate-500 text-xs">TourFlow Dashboard</p>
          </div>
          <Link
            href="/create"
            className="bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            + Yeni Təklif
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            ⚙️ Profil
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Ümumi Təklif" value={offers.length} emoji="📋" />
          <StatCard label="Ümumi Baxış"  value={totalViews}    emoji="👁" />
          <StatCard label="Seçilmiş"     value={totalSelected} emoji="✅" />
        </div>

        {/* ── Offers list ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Göndərilmiş Təkliflər</h2>
            <span className="text-xs text-slate-400">{offers.length} təklif</span>
          </div>

          {offers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-slate-500 font-medium">Hələ təklif göndərməmisiniz</p>
              <Link
                href="/create"
                className="mt-4 inline-block bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-blue-800 transition-colors"
              >
                İlk təklifi yarat
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {offers.map(offer => {
                const offerUrl = `${siteUrl}/offer/${offer.id}`;
                const isSelected = offer.status === 'selected';

                return (
                  <li key={offer.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Left: offer info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm truncate">
                            {offer.client_name}
                          </span>
                          <span className="text-slate-400 text-xs">→</span>
                          <span className="text-blue-700 font-semibold text-sm truncate">
                            {offer.destination}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({offer.hotels?.length ?? 0} otel)
                          </span>
                        </div>

                        {/* Date & creation time */}
                        <div className="flex items-center gap-3 mt-1">
                          {offer.date_range && (
                            <span className="text-xs text-slate-500">📅 {offer.date_range}</span>
                          )}
                          <span className="text-xs text-slate-400">
                            {formatDate(offer.created_at)}
                          </span>
                        </div>

                        {/* Analytics */}
                        <div className="flex items-center gap-3 mt-2">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              ✅ Seçilib: {offer.selected_hotel}
                            </span>
                          ) : (offer.views_count ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              👁 Baxılıb {offer.views_count} dəfə
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              ⏳ Gözlənilir
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CopyButton url={offerUrl} />
                        <a
                          href={offerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
                        >
                          👁 Bax
                        </a>
                        <Link
                          href={`/create?from=${offer.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
                        >
                          📋 Kopyala
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
