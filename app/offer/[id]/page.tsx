import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Hotel, Offer } from '@/lib/types';
import { INCLUDES_META, MEAL_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import { PLANS, getEffectivePlan, DEFAULT_PLAN_DATA, type ProfilePlanData } from '@/lib/planConfig';
import WhatsAppButton from './WhatsAppButton';
import OfferViewTracker from './OfferViewTracker';
import CustomerResponse from './CustomerResponse';
import HotelImage from './HotelImage';
import CustomerNote from './CustomerNote';
import Icon, { INCLUDE_ICON, type IconName } from '@/app/components/Icon';
import { WaIcon } from '@/app/dashboard/WhatsAppMsgButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const offer = await db.getOffer(id);
  if (!offer) return { title: 'Təklif tapılmadı — TourFlow' };

  const agency = offer.agencyName?.trim() || 'Səyahət Agentliyi';
  const price  = offer.hotels[0]
    ? `${offer.hotels[0].price.toLocaleString()} ${offer.hotels[0].currency}`
    : '';

  return {
    title:       `${offer.destination} tur təklifi — ${agency}`,
    description: `${offer.clientName} üçün ${offer.destination} üzrə ${offer.hotels.length} otel variantı${price ? `, ${price}-dən başlayan` : ''}. ${agency} tərəfindən hazırlanmış fərdi tur paketi.`,
    openGraph: {
      title:       `${offer.destination} Tur Paketi — ${agency}`,
      description: `${offer.hotels.length} otel variantı${offer.dateRange ? `, ${offer.dateRange}` : ''}${price ? `, ${price}-dən` : ''}. TourFlow ilə hazırlanmış fərdi təklif.`,
      type:        'website',
    },
  };
}

// Parse adult count from passengers string for total price calculation
function parseAdults(passengers: string): number {
  const m = passengers.match(/(\d+)\s*böyük/);
  return m ? parseInt(m[1]) : 1;
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer: Offer | null = await db.getOffer(id);

  if (!offer) notFound();

  const isExpired = offer.expiresAt ? new Date(offer.expiresAt) < new Date() : false;
  const agencyLabel = offer.agencyName?.trim() || 'Səyahət Agentliyi';
  const waNumber    = offer.managerWhatsapp.replace(/\D/g, '');
  const waUrl       = `https://wa.me/${waNumber}`;

  // Check if agency plan allows customer favorites/notes
  let showCustomerNote = false;
  if (offer.agencyId) {
    const supabase = await createSupabaseServerClient();
    const { data: agencyProfile } = await supabase
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at')
      .eq('id', offer.agencyId)
      .maybeSingle<Pick<ProfilePlanData, 'plan_tier' | 'subscription_status' | 'trial_ends_at'>>();
    if (agencyProfile) {
      const tier = getEffectivePlan(agencyProfile);
      showCustomerNote = PLANS[tier].features.customerFavorites;
    }
  }

  // ── Expired state ──────────────────────────────────────────────────────────
  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full card p-8 text-center space-y-5">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Icon name="clock" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-ink text-lg font-semibold">Təklifin müddəti bitib</h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Bu təklif artıq aktiv deyil. Yeni qiymətlər üçün{' '}
              <span className="font-medium text-ink">{agencyLabel}</span> ilə
              birbaşa əlaqə saxlayın.
            </p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-lg btn-primary w-full"
          >
            <WaIcon className="w-5 h-5" /> Menecerlə əlaqə saxla
          </a>
        </div>
      </div>
    );
  }

  // ── Main customer view ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <OfferViewTracker offerId={offer.id} />

      {/* ── Header: white, sticky, agency branding ───────────────────────── */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          {offer.agencyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.agencyLogo}
              alt={agencyLabel}
              className="w-9 h-9 rounded-lg object-contain border border-slate-200 bg-white flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {agencyLabel.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm leading-tight truncate">
              {agencyLabel}
            </p>
            {offer.managerName && (
              <p className="text-slate-500 text-xs truncate">{offer.managerName}</p>
            )}
          </div>
          <span className="pill pill-neutral flex-shrink-0">Fərdi təklif</span>
        </div>
      </header>

      {/* ── Hero: dark navy greeting — clearly distinct from white content ── */}
      <div className="bg-ink">
        <div className="max-w-lg mx-auto px-5 py-7">
          <p className="text-brand-300 text-[11px] font-semibold uppercase tracking-[0.12em] mb-2">
            Şəxsi tur paketi
          </p>
          <h1 className="text-white text-2xl font-semibold tracking-tight leading-snug mb-1">
            Hörmətli {offer.clientName}
          </h1>
          <p className="text-slate-400 text-sm mb-5">
            Sizin üçün hazırlanmış {offer.hotels.length} otel variantı
          </p>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            <InfoChip icon="pin" text={offer.destination} />
            {offer.dateRange && <InfoChip icon="calendar" text={offer.dateRange} />}
            {offer.nights > 0 && !offer.dateRange?.includes('gecə') && <InfoChip icon="moon" text={`${offer.nights} gecə`} />}
            {offer.passengers && <InfoChip icon="users" text={offer.passengers} />}
            {offer.expiresAt && (() => {
              const daysLeft = Math.ceil((new Date(offer.expiresAt!).getTime() - Date.now()) / 86_400_000);
              return daysLeft > 0 ? <InfoChip icon="clock" text={`Təklif ${daysLeft} gün etibarlıdır`} /> : null;
            })()}
          </div>

          {/* Included services */}
          {offer.includes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-2">Qiymətə daxildir</p>
              <div className="flex flex-wrap gap-1.5">
              {INCLUDES_META.filter(m => offer.includes.includes(m.key)).map(m => (
                <span
                  key={m.key}
                  className="inline-flex items-center gap-1.5 text-slate-300 text-xs px-2.5 py-1 rounded-full border border-white/15"
                >
                  <Icon name={INCLUDE_ICON[m.key] ?? 'check'} className="w-3.5 h-3.5 text-slate-400" />
                  {m.label}
                </span>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Hotel cards ───────────────────────────────────────────────────── */}
      <section className="max-w-lg mx-auto px-4 py-5 pb-32 space-y-5">
        <p className="section-title pl-1">
          {offer.hotels.length === 1 ? 'Otel' : `${offer.hotels.length} otel variantı`}
        </p>

        {offer.hotels.map((hotel, i) => (
          <HotelCard
            key={i}
            hotel={hotel}
            index={i}
            offer={offer}
            offerId={offer.id}
          />
        ))}

        {/* Customer favourites + note (Growth+ only) */}
        {showCustomerNote && (
          <CustomerNote
            offerId={offer.id}
            hotelNames={offer.hotels.map(h => h.name)}
          />
        )}

        {/* Customer feedback — white card, clearly separated section */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-ink">Təklif sizə uyğundurmu?</p>
            <p className="text-xs text-slate-500 mt-0.5">Bir kliklə menecerə bildirin</p>
          </div>
          <div className="px-5 py-4">
            <CustomerResponse offerId={offer.id} />
          </div>
        </div>

        {/* Validity note */}
        <div className="flex items-start gap-2.5 px-1">
          <Icon name="info" className="w-4 h-4 text-slate-400 mt-px flex-shrink-0" />
          <p className="text-slate-500 text-xs leading-relaxed">
            Qiymətlər dəyişə bilər. Yerlər məhdud olduğundan vaxtında müraciət etmənizi
            tövsiyə edirik.
          </p>
        </div>
      </section>

      {/* ── Sticky WhatsApp footer ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-lg btn-primary w-full"
          >
            <WaIcon className="w-5 h-5" />
            Menecerlə əlaqə saxla
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Info chip (used in dark hero section) ────────────────────────────────────
function InfoChip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/[0.06] text-slate-200 text-xs px-3 py-1.5 rounded-full border border-white/10">
      <Icon name={icon} className="w-3.5 h-3.5 text-slate-400" />
      {text}
    </span>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill={i < count ? '#FFFFFF' : 'rgba(255,255,255,0.35)'}
          className="w-3.5 h-3.5"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Individual hotel card ────────────────────────────────────────────────────
function HotelCard({
  hotel,
  index,
  offer,
  offerId,
}: {
  hotel:   Hotel;
  index:   number;
  offer:   Offer;
  offerId: string;
}) {
  const symbol     = CURRENCY_SYMBOLS[hotel.currency] ?? hotel.currency;
  const mealText   = MEAL_LABELS[hotel.mealType] ?? hotel.mealType;
  const isPerPerson = hotel.priceType !== 'total';
  const adults     = parseAdults(offer.passengers ?? '');
  const totalPrice = isPerPerson ? hotel.price * adults : hotel.price;
  const priceLabel = isPerPerson ? 'Nəfər başına' : 'Ümumi paket';

  const totalStr = isPerPerson && adults > 1
    ? `, cəmi ${totalPrice.toLocaleString('az-AZ')} ${symbol}`
    : '';
  const waMessage = `Salam! Göndərdiyiniz təklifə baxdım. ${offer.destination} üzrə ${offer.dateRange || 'göstərilən'} tarixləri üçün *${hotel.name}* (${hotel.price.toLocaleString()} ${symbol} ${priceLabel.toLowerCase()}${totalStr}) variantı ilə maraqlanıram.`;
  const waNumber  = offer.managerWhatsapp.replace(/\D/g, '');
  const waUrl     = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <article className="card overflow-hidden">
      {/* Hotel image — gradient placeholder when no image uploaded */}
      <div className="relative h-[240px] w-full overflow-hidden bg-slate-100">
        <HotelImage src={hotel.imageUrl?.trim() ?? ''} alt={hotel.name} stars={hotel.stars} index={index} />

        {/* Variant badge */}
        <div className="absolute top-3 left-3 bg-white/95 text-ink text-xs font-medium px-2.5 py-1 rounded-full">
          Variant {index + 1}
        </div>

        {/* Stock photo disclaimer */}
        {hotel.imageUrl?.trim()?.includes('images.unsplash.com') && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
            Təsviri şəkil
          </div>
        )}

        {/* Stars + meal type overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3.5 pt-10">
          <div className="flex items-center gap-2">
            <Stars count={hotel.stars} />
            <span className="bg-black/30 backdrop-blur-sm text-xs text-white font-medium px-2 py-0.5 rounded-full border border-white/25">
              {hotel.mealType}
            </span>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 pb-5 pt-4 space-y-3">
        {/* Hotel name + location + meal */}
        <div>
          <h3 className="text-ink font-semibold text-lg tracking-tight leading-tight">
            {hotel.name}
          </h3>
          <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap text-xs text-slate-500">
            {hotel.city && hotel.country && (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" className="w-3.5 h-3.5 text-slate-400" />
                {hotel.city}, {hotel.country}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Icon name="utensils" className="w-3.5 h-3.5 text-slate-400" />
              {mealText}
            </span>
          </div>
        </div>

        {/* Special note */}
        {hotel.note && (
          <div className="border-l-2 border-brand-500 pl-3 py-0.5">
            <p className="text-slate-700 text-sm leading-snug">{hotel.note}</p>
          </div>
        )}

        <div className="border-t border-slate-100" />

        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-ink tracking-tight">
              {hotel.price.toLocaleString('az-AZ')}
            </span>
            <span className="text-xl font-semibold text-ink">{symbol}</span>
            <span className="text-xs text-slate-500 ml-2 self-end pb-1">{priceLabel.toLowerCase()}</span>
          </div>
          {isPerPerson && adults > 1 && (
            <p className="text-sm text-slate-500">
              Cəmi:{' '}
              <span className="font-semibold text-ink">
                {totalPrice.toLocaleString('az-AZ')} {symbol}
              </span>
              <span className="text-xs text-slate-400"> ({adults} nəfər)</span>
            </p>
          )}
        </div>

        {/* WhatsApp CTA */}
        <WhatsAppButton waUrl={waUrl} hotelName={hotel.name} offerId={offerId} />
      </div>
    </article>
  );
}
