import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import CopyButton from './CopyButton';
import LogoutButton from './LogoutButton';
import DeleteOfferButton from './DeleteOfferButton';
import type { ReactNode } from 'react';

// ─── Row type from offers table ───────────────────────────────────────────────
interface OfferRow {
  id: string;
  client_name: string;
  destination: string;
  date_range: string;
  nights: number;
  hotels: { name: string; price: number; currency: string }[];
  created_at: string;
  views_count: number | null;
  selected_hotel: string | null;
  status: string | null;
  customer_response: string | null;
  expires_at: string | null;
  last_viewed_at: string | null;
}

// ─── Profile type ─────────────────────────────────────────────────────────────
interface AgencyProfile {
  id: string;
  agency_name: string | null;
  agency_logo: string | null;
  whatsapp: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins} dəq əvvəl`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days  = Math.floor(hours / 24);
  if (days < 30)  return `${days} gün əvvəl`;
  return formatDate(iso);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileResult, offersResult] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('id, agency_name, agency_logo, whatsapp')
      .eq('id', user.id)
      .single<AgencyProfile>(),
    supabase
      .from('offers')
      .select('id, client_name, destination, date_range, nights, hotels, created_at, views_count, selected_hotel, status, customer_response, expires_at, last_viewed_at')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const profile: AgencyProfile | null = profileResult.data;
  const offers: OfferRow[] = offersResult.data ?? [];

  const agencyLabel   = profile?.agency_name ?? user.email ?? 'Agentlik';
  const totalViews    = offers.reduce((s, o) => s + (o.views_count ?? 0), 0);
  const totalSelected = offers.filter(o => o.status === 'selected').length;

  const reqHeaders = await headers();
  const host    = reqHeaders.get('host') ?? '';
  const proto   = host.startsWith('localhost') ? 'http' : 'https';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${proto}://${host}` : '');

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black flex-shrink-0">
            {agencyLabel.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm leading-tight truncate">{agencyLabel}</h1>
            <p className="text-slate-500 text-xs">TourFlow Panel</p>
          </div>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            📊 Analitika
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            ⚙️ Profil
          </Link>
          <Link
            href="/create"
            className="bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex-shrink-0"
          >
            + Yeni Təklif
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Ümumi Təklif" value={offers.length}  emoji="📋" />
          <StatCard label="Ümumi Baxış"  value={totalViews}     emoji="👁" />
          <StatCard label="Seçilmiş"     value={totalSelected}  emoji="✅" />
        </div>

        {/* ── Analytics banner ─────────────────────────────────────────── */}
        <Link
          href="/dashboard/analytics"
          className="flex items-center justify-between bg-[#0A0F1E] text-white rounded-2xl px-5 py-4 hover:bg-[#111827] transition-colors group border border-white/5"
        >
          <div>
            <p className="font-bold text-sm">Analitika Paneli</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Müştəri davranışı · Populyar istiqamətlər · Dönüşüm nisbəti
            </p>
          </div>
          <span className="text-slate-500 group-hover:text-white transition-colors">→</span>
        </Link>

        {/* ── Offers list ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Göndərilmiş Təkliflər</h2>
            <span className="text-xs text-slate-400">{offers.length} ədəd</span>
          </div>

          {offers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-slate-500 font-medium text-sm">Hələ heç bir təklif göndərməmisiniz</p>
              <Link
                href="/create"
                className="mt-4 inline-block bg-[#0A0F1E] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                İlk təklifi yarat
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {offers.map(offer => {
                const offerUrl      = `${siteUrl}/offer/${offer.id}`;
                const isSelected    = offer.status === 'selected';
                const isExpired     = offer.expires_at
                  ? new Date(offer.expires_at) < new Date()
                  : false;
                const expiresInDays = offer.expires_at
                  ? Math.ceil((new Date(offer.expires_at).getTime() - Date.now()) / 86_400_000)
                  : null;

                // Determine activity badge (most important signal for manager)
                let activityBadge: ReactNode;
                if (offer.customer_response === 'interested') {
                  activityBadge = <Badge color="teal">✅ Maraqlandı</Badge>;
                } else if (offer.customer_response === 'price_high') {
                  activityBadge = <Badge color="amber">💬 Qiymət yüksəkdir</Badge>;
                } else if (offer.customer_response === 'not_interested') {
                  activityBadge = <Badge color="slate">❌ Maraqlanmadı</Badge>;
                } else if (isSelected) {
                  activityBadge = <Badge color="green">🔥 Seçilib: {offer.selected_hotel}</Badge>;
                } else if ((offer.views_count ?? 0) > 0) {
                  activityBadge = <Badge color="blue">👁 {offer.views_count} baxış</Badge>;
                } else {
                  activityBadge = <Badge color="slate">⏳ Gözlənilir</Badge>;
                }

                return (
                  <li key={offer.id} className="px-5 py-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start gap-4">

                      {/* Left: offer info */}
                      <div className="flex-1 min-w-0">

                        {/* Row 1: client → destination + expiry */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">
                            {offer.client_name}
                          </span>
                          <span className="text-slate-300">→</span>
                          <span className="font-semibold text-slate-700 text-sm">
                            {offer.destination}
                          </span>
                          {isExpired ? (
                            <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full font-medium">
                              ⌛ Bitib
                            </span>
                          ) : expiresInDays !== null && expiresInDays <= 7 ? (
                            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                              ⏰ {expiresInDays}g qalıb
                            </span>
                          ) : null}
                        </div>

                        {/* Row 2: date + hotel names */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {offer.date_range && (
                            <span className="text-xs text-slate-400">📅 {offer.date_range}</span>
                          )}
                          {offer.hotels?.length > 0 && (
                            <span className="text-xs text-slate-400 truncate max-w-xs">
                              🏨 {offer.hotels.map(h => h.name).join(' · ')}
                            </span>
                          )}
                        </div>

                        {/* Row 3: activity badge + last viewed timestamp */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {activityBadge}
                          {offer.last_viewed_at && (
                            <span className="text-xs text-slate-400">
                              Son baxış: {timeAgo(offer.last_viewed_at)}
                            </span>
                          )}
                          <span className="text-xs text-slate-300">
                            Yaradıldı: {formatDate(offer.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
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
                        <DeleteOfferButton offerId={offer.id} />
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
function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Generic badge ────────────────────────────────────────────────────────────
const BADGE_COLORS = {
  teal:  'bg-teal-50 text-teal-700 border-teal-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  slate: 'bg-slate-100 text-slate-500 border-slate-200',
  green: 'bg-green-50 text-green-700 border-green-100',
  blue:  'bg-blue-50 text-blue-700 border-blue-100',
} as const;

function Badge({
  color,
  children,
}: {
  color: keyof typeof BADGE_COLORS;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1 border text-xs font-semibold px-2.5 py-0.5 rounded-full ${BADGE_COLORS[color]}`}>
      {children}
    </span>
  );
}
