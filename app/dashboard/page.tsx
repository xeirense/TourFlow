import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import CopyButton from './CopyButton';
import LogoutButton from './LogoutButton';
import DeleteOfferButton from './DeleteOfferButton';
import WhatsAppMsgButton from './WhatsAppMsgButton';
import {
  PLANS,
  getEffectivePlan,
  getTrialDaysLeft,
  DEFAULT_PLAN_DATA,
  type ProfilePlanData,
  type PlanTier,
} from '@/lib/planConfig';
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
  parent_offer_id: string | null;
  customer_note: string | null;
  created_by: string | null;
  client_phone: string | null;
}

interface TeamMember {
  member_user_id: string | null;
  invited_email: string;
  display_name: string | null;
  status: string;
}

// ─── Profile type ─────────────────────────────────────────────────────────────
interface AgencyProfile extends ProfilePlanData {
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
  if (mins < 1)   return 'indicə';
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

  // ── Auto-link: if user was invited to a team, link their account ────────────
  if (user.email) {
    const { data: pendingMembership } = await supabase
      .from('agency_members')
      .select('id')
      .eq('invited_email', user.email)
      .is('member_user_id', null)
      .maybeSingle();
    if (pendingMembership) {
      await supabase
        .from('agency_members')
        .update({ member_user_id: user.id, status: 'active' })
        .eq('id', pendingMembership.id);
    }
  }

  const [profileResult, teamResult] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('id, agency_name, agency_logo, whatsapp, plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<AgencyProfile>(),
    supabase
      .from('agency_members')
      .select('member_user_id, invited_email, display_name, status')
      .eq('owner_id', user.id),
  ]);

  const profile: AgencyProfile | null = profileResult.data;
  const teamMembers: TeamMember[] = (teamResult.data ?? []) as TeamMember[];
  const memberIds = teamMembers
    .filter(m => m.member_user_id && m.status === 'active')
    .map(m => m.member_user_id as string);
  const allIds = [user.id, ...memberIds];

  const { data: offersData } = await supabase
    .from('offers')
    .select('id, client_name, destination, date_range, nights, hotels, created_at, views_count, selected_hotel, status, customer_response, expires_at, last_viewed_at, parent_offer_id, customer_note, created_by, client_phone')
    .in('agency_id', allIds)
    .order('created_at', { ascending: false })
    .limit(100);

  const offers: OfferRow[] = (offersData ?? []) as OfferRow[];

  const agencyLabel   = profile?.agency_name ?? user.email ?? 'Agentlik';
  const totalViews    = offers.reduce((s, o) => s + (o.views_count ?? 0), 0);
  const totalSelected = offers.filter(o => o.status === 'selected').length;

  // Plan status
  const planData      = profile ?? DEFAULT_PLAN_DATA;
  const effectiveTier = getEffectivePlan(planData);
  const planInfo      = PLANS[effectiveTier];
  const trialDaysLeft = getTrialDaysLeft(planData.trial_ends_at);
  const isTrialing    = planData.subscription_status === 'trialing' && trialDaysLeft > 0;
  const monthlyUsed   = planData.monthly_offers_used ?? 0;
  const monthlyLimit  = planInfo.limits.monthlyOfferLimit;

  const reqHeaders = await headers();
  const host    = reqHeaders.get('host') ?? '';
  const proto   = host.startsWith('localhost') ? 'http' : 'https';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${proto}://${host}` : '');

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-[#0A0F1E] border-b border-white/5 text-white px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          {/* Top row: logo + brand + desktop nav + CTA + logout */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black flex-shrink-0">
              {agencyLabel.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate">{agencyLabel}</h1>
            </div>
            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard/analytics"
                className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
              >
                📊 Analitika
              </Link>
              <Link
                href="/dashboard/team"
                className="relative text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
              >
                👥 Komanda
                {teamMembers.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                    {teamMembers.length}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
              >
                ⚙️ Profil
              </Link>
            </nav>
            <Link
              href="/create"
              className="bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap"
            >
              + Yeni
            </Link>
            <LogoutButton />
          </div>
          {/* Mobile nav row — scrollable, hidden on sm+ */}
          <nav className="sm:hidden mt-2 flex items-center gap-1 overflow-x-auto pb-1">
            <Link
              href="/dashboard/analytics"
              className="flex-shrink-0 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
            >
              📊 Analitika
            </Link>
            <Link
              href="/dashboard/team"
              className="flex-shrink-0 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
            >
              👥 Komanda
              {teamMembers.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-teal-500 rounded-full text-[9px] font-bold">
                  {teamMembers.length}
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex-shrink-0 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 whitespace-nowrap"
            >
              ⚙️ Profil
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Ümumi Təklif" value={offers.length}  emoji="📋" />
          <StatCard label="Ümumi Baxış"  value={totalViews}     emoji="👁" />
          <StatCard label="Seçilmiş"     value={totalSelected}  emoji="✅" />
        </div>

        {/* ── Plan status banner ───────────────────────────────────────── */}
        <PlanBanner
          planName={planInfo.name}
          tier={effectiveTier}
          isTrialing={isTrialing}
          trialDaysLeft={trialDaysLeft}
          monthlyUsed={monthlyUsed}
          monthlyLimit={monthlyLimit}
        />

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

                        {/* Row 1: client → destination + expiry + alt badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">
                            {offer.client_name}
                          </span>
                          <span className="text-slate-300">→</span>
                          <span className="font-semibold text-slate-700 text-sm">
                            {offer.destination}
                          </span>
                          {offer.parent_offer_id && (
                            <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full font-medium">
                              ↩ Alternativ
                            </span>
                          )}
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

                        {/* Row 3: activity badge + last viewed + customer note */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {activityBadge}
                          {offer.last_viewed_at && (
                            <span className="text-xs text-slate-400">
                              Son baxış: {timeAgo(offer.last_viewed_at)}
                            </span>
                          )}
                          <span className="text-xs text-slate-300">
                            {formatDate(offer.created_at)}
                          </span>
                        </div>
                        {/* Customer note */}
                        {offer.customer_note && (
                          <div className="mt-1.5 flex items-start gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 max-w-sm">
                            <span className="text-blue-500 text-xs flex-shrink-0 mt-0.5">📝</span>
                            <p className="text-xs text-blue-700 leading-relaxed">{offer.customer_note}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <WhatsAppMsgButton
                            clientName={offer.client_name}
                            destination={offer.destination}
                            dateRange={offer.date_range}
                            nights={offer.nights}
                            hotelsCount={offer.hotels?.length ?? 0}
                            offerLink={offerUrl}
                            clientPhone={offer.client_phone ?? undefined}
                            waNumber={(profile?.whatsapp ?? '').replace(/\D/g, '')}
                          />
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
                            📋 Dublikat
                          </Link>
                        </div>
                        {/* Alternativ yarat (shown for price_high responses) */}
                        {offer.customer_response === 'price_high' && (
                          <Link
                            href={`/create?from=${offer.id}&alt=1`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold transition-colors"
                          >
                            ↩ Alternativ Yarat
                          </Link>
                        )}
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

// ─── Plan status banner ────────────────────────────────────────────────────────
function PlanBanner({
  planName,
  tier,
  isTrialing,
  trialDaysLeft,
  monthlyUsed,
  monthlyLimit,
}: {
  planName:      string;
  tier:          PlanTier;
  isTrialing:    boolean;
  trialDaysLeft: number;
  monthlyUsed:   number;
  monthlyLimit:  number | null;
}) {
  const WA_SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_WA ?? '';
  const waHref = WA_SUPPORT
    ? `https://wa.me/${WA_SUPPORT.replace(/\D/g, '')}?text=${encodeURIComponent('Salam! TourFlow planımı yüksəltmək istəyirəm.')}`
    : '';

  // Don't show banner for active growth/pro/enterprise (only show for starter or trialing)
  if (!isTrialing && tier !== 'starter') return null;

  const usagePct = monthlyLimit ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;
  const isNearLimit = monthlyLimit && monthlyUsed >= monthlyLimit * 0.8;

  return (
    <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${
      isTrialing
        ? 'bg-teal-50 border-teal-100'
        : isNearLimit
        ? 'bg-amber-50 border-amber-200'
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex-1 min-w-0">
        {isTrialing ? (
          <p className="text-sm font-bold text-teal-800">
            {planName} — Pulsuz Sınaq: <span className="text-teal-600">{trialDaysLeft} gün qalıb</span>
          </p>
        ) : (
          <p className={`text-sm font-bold ${isNearLimit ? 'text-amber-800' : 'text-slate-700'}`}>
            {planName} Planı — {monthlyUsed} / {monthlyLimit} aylıq təklif istifadə olunub
          </p>
        )}
        {monthlyLimit && (
          <div className="mt-2 h-1.5 w-full max-w-xs bg-white/70 rounded-full overflow-hidden border border-black/5">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 80 ? 'bg-amber-500' : 'bg-teal-500'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white transition-colors whitespace-nowrap"
        >
          Planı Yüksəlt ↗
        </a>
      )}
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
