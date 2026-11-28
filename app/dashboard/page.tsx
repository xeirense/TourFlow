import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getAuth } from '@/lib/auth';
import CopyButton from './CopyButton';
import WhatsAppMsgButton from './WhatsAppMsgButton';
import OfferMenu from './OfferMenu';
import TodayReminders from './TodayReminders';
import Onboarding, { type OnboardingStep } from './Onboarding';
import Icon from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';

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
  status: string;
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
  const { supabase, user } = await getAuth();
  if (!user) redirect('/login');

  // ── Auto-link (if this user was invited to a team) runs in parallel with
  //    the profile/team queries instead of blocking them.
  const autoLink = (async () => {
    if (!user.email) return;
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
  })();

  const [profileResult, teamResult, , membershipResult] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('whatsapp, agency_logo, agency_name, telegram_chat_id')
      .eq('id', user.id)
      .maybeSingle<{ whatsapp: string | null; agency_logo: string | null; agency_name: string | null; telegram_chat_id: number | null }>(),
    supabase
      .from('agency_members')
      .select('member_user_id, status')
      .eq('owner_id', user.id),
    autoLink,
    supabase
      .from('agency_members')
      .select('id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const teamMembers: TeamMember[] = (teamResult.data ?? []) as TeamMember[];
  const memberIds = teamMembers
    .filter(m => m.member_user_id && m.status === 'active')
    .map(m => m.member_user_id as string);
  const allIds = [user.id, ...memberIds];

  const [{ data: offersData }, { data: todayRemindersData }] = await Promise.all([
    supabase
      .from('offers')
      .select('id, client_name, destination, date_range, nights, hotels, created_at, views_count, selected_hotel, status, customer_response, expires_at, last_viewed_at, parent_offer_id, customer_note, created_by, client_phone')
      .in('agency_id', allIds)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('reminders')
      .select('id, text, kind, due_at, client_id, clients(full_name, phone)')
      .eq('manager_id', user.id)
      .lte('due_at', new Date().toISOString())
      .is('done_at', null)
      .order('due_at', { ascending: true })
      .limit(10),
  ]);

  const offers: OfferRow[] = (offersData ?? []) as OfferRow[];

  const viewedCount    = offers.filter(o => (o.views_count ?? 0) > 0).length;
  const respondedCount = offers.filter(o => o.customer_response).length;
  const selectedCount  = offers.filter(o => o.status === 'selected').length;
  const conversion     = offers.length ? Math.round((selectedCount / offers.length) * 100) : 0;

  const reqHeaders = await headers();
  const host    = reqHeaders.get('host') ?? '';
  const proto   = host.startsWith('localhost') ? 'http' : 'https';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${proto}://${host}` : '');
  const managerWa = (profileResult.data?.whatsapp ?? '').replace(/\D/g, '');

  // ── First-run checklist (owners only; invited managers skip it) ──────────
  const isTeamMember = !!membershipResult.data;
  const prof = profileResult.data;
  const onboarding: OnboardingStep[] = [
    { key: 'profile',  icon: 'building', title: 'Agentlik profilini doldurun', desc: 'Ad və WhatsApp nömrəsi müştərinin gördüyü təklif səhifəsində göstərilir.', href: '/dashboard/settings', cta: 'Profil',     done: !!(prof?.agency_name && prof?.whatsapp) },
    { key: 'logo',     icon: 'image',    title: 'Loqonu yükləyin',             desc: 'Hər təklif agentliyinizin brendi ilə açılsın.',                                 href: '/dashboard/settings', cta: 'Yüklə',      done: !!prof?.agency_logo },
    { key: 'offer',    icon: 'file',     title: 'İlk təklifi göndərin',         desc: 'Kataloqdan otel seçin, linki müştəriyə WhatsApp-la göndərin.',                  href: '/create',             cta: 'Yarat',      done: offers.length > 0 },
    { key: 'team',     icon: 'users',    title: 'Menecerləri dəvət edin',       desc: 'Komandanın təklifləri və nəticələri bir paneldə görünsün.',                     href: '/dashboard/team',     cta: 'Dəvət et',   done: teamMembers.length > 0 },
    { key: 'telegram', icon: 'send',     title: 'Telegram bildirişlərini qoşun', desc: 'Müştəri təklifi açanda telefonunuza dərhal mesaj gəlsin.',                    href: '/dashboard/settings', cta: 'Qoş',        done: !!prof?.telegram_chat_id },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <PageTitle
        title="Təkliflər"
        subtitle="Göndərdiyiniz təkliflər və müştərilərin reaksiyası"
      />

      {!isTeamMember && <Onboarding steps={onboarding} userId={user.id} />}

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Göndərilib"   value={offers.length} />
        <Kpi label="Baxılıb"      value={viewedCount}    hint={offers.length ? `${Math.round((viewedCount / offers.length) * 100)}%` : undefined} />
        <Kpi label="Rəy bildirib" value={respondedCount} />
        <Kpi label="Otel seçib"   value={selectedCount}  hint={offers.length ? `${conversion}% dönüşüm` : undefined} accent />
      </div>

      {/* ── Today's reminders ────────────────────────────────────────── */}
      <TodayReminders reminders={(todayRemindersData ?? []) as unknown as Parameters<typeof TodayReminders>[0]['reminders']} />

      {/* ── Offers list ──────────────────────────────────────────────── */}
      <section className="card">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Son təkliflər</h2>
          <span className="text-xs text-slate-500">{offers.length}</span>
        </div>

        {offers.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Icon name="inbox" className="w-6 h-6" />
            </div>
            <p className="text-ink font-medium text-sm mt-4">Hələ təklif göndərməmisiniz</p>
            <p className="text-slate-500 text-sm mt-1">İlk təklifi yaradın və linki müştəriyə WhatsApp-la göndərin.</p>
            <Link href="/create" className="btn btn-md btn-primary mt-5">
              <Icon name="plus" className="w-4 h-4" strokeWidth={2} />
              Yeni təklif
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {offers.map(offer => {
              const offerUrl      = `${siteUrl}/offer/${offer.id}`;
              const isExpired     = offer.expires_at ? new Date(offer.expires_at) < new Date() : false;
              const expiresInDays = offer.expires_at
                ? Math.ceil((new Date(offer.expires_at).getTime() - Date.now()) / 86_400_000)
                : null;

              return (
                <li key={offer.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">

                    {/* Left: who / where */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink text-sm">{offer.client_name}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-sm text-slate-600">{offer.destination}</span>
                        {offer.parent_offer_id && <span className="pill pill-neutral">Alternativ</span>}
                      </div>

                      <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 flex-wrap text-xs text-slate-500">
                        {offer.date_range && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="calendar" className="w-3.5 h-3.5 text-slate-400" />
                            {offer.date_range}
                          </span>
                        )}
                        {offer.hotels?.length > 0 && (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <Icon name="bed" className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[260px]">
                              {offer.hotels.length === 1 ? offer.hotels[0].name : `${offer.hotels.length} otel variantı`}
                            </span>
                          </span>
                        )}
                        <span>{formatDate(offer.created_at)}</span>
                      </div>

                      {offer.customer_note && (
                        <p className="mt-2 text-xs text-slate-600 border-l-2 border-brand-300 pl-2.5 max-w-lg">
                          <span className="text-slate-400">Müştərinin qeydi: </span>
                          {offer.customer_note}
                        </p>
                      )}
                    </div>

                    {/* Middle: status */}
                    <div className="md:w-56 flex-shrink-0">
                      <StatusPill offer={offer} />
                      <p className="text-xs text-slate-500 mt-1">
                        {isExpired ? (
                          <span className="text-red-600">Müddəti bitib</span>
                        ) : (
                          <>
                            {offer.last_viewed_at ? `Son baxış ${timeAgo(offer.last_viewed_at)}` : 'Hələ açılmayıb'}
                            {expiresInDays !== null && expiresInDays <= 7 && (
                              <span className="text-slate-400"> · {expiresInDays} gün qalıb</span>
                            )}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <WhatsAppMsgButton
                        clientName={offer.client_name}
                        destination={offer.destination}
                        dateRange={offer.date_range}
                        nights={offer.nights}
                        hotelsCount={offer.hotels?.length ?? 0}
                        offerLink={offerUrl}
                        clientPhone={offer.client_phone ?? undefined}
                        waNumber={managerWa}
                      />
                      <CopyButton url={offerUrl} />
                      <OfferMenu
                        offerId={offer.id}
                        previewUrl={`${offerUrl}?preview=1`}
                        showAlternative={offer.customer_response === 'price_high'}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function Kpi({ label, value, hint, accent }: { label: string; value: number; hint?: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-4">
      <p className="section-title">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className={`text-2xl font-semibold tracking-tight ${accent ? 'text-brand-700' : 'text-ink'}`}>{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

// ─── Status pill: one clear signal per offer ─────────────────────────────────
function StatusPill({ offer }: { offer: OfferRow }) {
  if (offer.status === 'selected') {
    return (
      <span className="pill pill-strong max-w-full">
        <Icon name="check" className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
        <span className="truncate">Seçdi: {offer.selected_hotel}</span>
      </span>
    );
  }
  switch (offer.customer_response) {
    case 'interested':     return <span className="pill pill-brand">Maraqlanır</span>;
    case 'price_high':     return <span className="pill pill-neutral">Qiymət yüksəkdir</span>;
    case 'not_interested': return <span className="pill pill-neutral text-slate-400">Maraqlanmır</span>;
  }
  if ((offer.views_count ?? 0) > 0) {
    return <span className="pill pill-neutral">Baxılıb · {offer.views_count}</span>;
  }
  return <span className="pill pill-neutral text-slate-400">Gözlənilir</span>;
}
