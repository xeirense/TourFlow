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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-3xl border border-amber-100">
            ⌛
          </div>
          <div>
            <h1 className="text-gray-900 text-xl font-bold">Təklif müddəti bitib</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Bu təklif artıq aktiv deyil. Yeni qiymətlər üçün{' '}
              <span className="font-semibold text-gray-700">{agencyLabel}</span> ilə
              birbaşa əlaqə saxlayın.
            </p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-sm active:scale-[.98] transition-all"
          >
            <WaIcon /> Menecer ilə əlaqə
          </a>
        </div>
      </div>
    );
  }

  // ── Main customer view ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <OfferViewTracker offerId={offer.id} />

      {/* ── Header: white, sticky, agency branding ───────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          {offer.agencyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.agencyLogo}
              alt={agencyLabel}
              className="w-9 h-9 rounded-xl object-contain border border-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#0A0F1E] flex items-center justify-center text-sm font-black text-white flex-shrink-0">
              {agencyLabel.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
              {agencyLabel}
            </p>
            {offer.managerName && (
              <p className="text-gray-400 text-xs truncate">{offer.managerName}</p>
            )}
          </div>
          <span className="flex-shrink-0 text-xs bg-gray-900 text-white font-semibold px-3 py-1 rounded-full">
            Fərdi Təklif
          </span>
        </div>
      </header>

      {/* ── Hero: dark navy greeting — clearly distinct from white content ── */}
      <div className="bg-[#0A0F1E]">
        <div className="max-w-lg mx-auto px-5 py-7">
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">
            Şəxsi Tur Paketi
          </p>
          <h1 className="text-white text-2xl font-extrabold leading-snug mb-1">
            Hörmətli {offer.clientName}
          </h1>
          <p className="text-gray-400 text-sm mb-5">
            Sizin üçün xüsusi hazırlanmış {offer.hotels.length}{' '}
            {offer.hotels.length === 1 ? 'tur variantı' : 'tur variantı'}
          </p>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            <InfoChip icon="📍" text={offer.destination} />
            {offer.dateRange && <InfoChip icon="📅" text={offer.dateRange} />}
            {offer.nights > 0 && <InfoChip icon="🌙" text={`${offer.nights} gecə`} />}
            {offer.passengers && <InfoChip icon="👥" text={offer.passengers} />}
            {offer.expiresAt && (() => {
              const daysLeft = Math.ceil((new Date(offer.expiresAt!).getTime() - Date.now()) / 86_400_000);
              return daysLeft > 0 ? <InfoChip icon="⏰" text={`${daysLeft} gün qalır`} /> : null;
            })()}
          </div>

          {/* Included services */}
          {offer.includes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {INCLUDES_META.filter(m => offer.includes.includes(m.key)).map(m => (
                <span
                  key={m.key}
                  className="inline-flex items-center gap-1 bg-white/10 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full border border-white/10"
                >
                  {m.emoji} {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hotel cards ───────────────────────────────────────────────────── */}
      <section className="max-w-lg mx-auto px-4 py-5 pb-32 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pl-1">
          {offer.hotels.length} Otel Variantı
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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Rəyiniz
            </p>
          </div>
          <div className="px-5 py-4">
            <CustomerResponse offerId={offer.id} />
          </div>
        </div>

        {/* Validity note */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <span className="text-amber-500 mt-0.5 flex-shrink-0 text-sm">⚠️</span>
          <p className="text-amber-700 text-xs leading-relaxed">
            Qiymətlər dəyişə bilər. Yerlər məhdud olduğundan vaxtında müraciət etmənizi
            tövsiyə edirik.
          </p>
        </div>
      </section>

      {/* ── Sticky WhatsApp footer ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 shadow-lg">
        <div className="max-w-lg mx-auto">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-sm active:scale-[.98] transition-all"
          >
            <WaIcon />
            Menecer ilə əlaqə saxla
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Info chip (used in dark hero section) ────────────────────────────────────
function InfoChip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/10 text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full border border-white/10">
      <span>{icon}</span> {text}
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
          fill={i < count ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
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
  const waMessage = `Salam! Göndərdiyiniz təklifə baxdım. ${offer.destination} üzrə ${offer.dateRange || 'göstərilən'} tarixləri üçün *${hotel.name}* (${hotel.price.toLocaleString()} ${symbol} nəfər başına${totalStr}) variantı ilə maraqlanıram.`;
  const waNumber  = offer.managerWhatsapp.replace(/\D/g, '');
  const waUrl     = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <article className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Hotel image — gradient placeholder when no image uploaded */}
      <div className="relative h-[260px] w-full overflow-hidden bg-gray-100">
        <HotelImage src={hotel.imageUrl?.trim() ?? ''} alt={hotel.name} stars={hotel.stars} index={index} />

        {/* Variant badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
          {index + 1}. Variant
        </div>

        {/* Stars + meal type overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3.5 pt-10">
          <div className="flex items-center gap-2">
            <Stars count={hotel.stars} />
            <span className="bg-black/40 backdrop-blur-sm text-xs text-white font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
              {hotel.mealType}
            </span>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 pb-5 pt-4 space-y-3">
        {/* Hotel name + meal description */}
        <div>
          <h3 className="text-gray-900 font-extrabold text-xl leading-tight">
            {hotel.name}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">{mealText}</p>
        </div>

        {/* Special note */}
        {hotel.note && (
          <div className="flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
            <span className="text-teal-600 text-sm mt-0.5 flex-shrink-0">✦</span>
            <p className="text-teal-700 text-sm font-medium leading-snug">{hotel.note}</p>
          </div>
        )}

        <div className="border-t border-gray-100" />

        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-gray-900 tracking-tight">
              {hotel.price.toLocaleString('az-AZ')}
            </span>
            <span className="text-2xl font-bold text-teal-600">{symbol}</span>
            <span className="text-xs text-gray-400 ml-2 self-end pb-0.5">{priceLabel}</span>
          </div>
          {isPerPerson && adults > 1 && (
            <p className="text-sm text-gray-500">
              Cəmi:{' '}
              <span className="font-bold text-gray-800">
                {totalPrice.toLocaleString('az-AZ')} {symbol}
              </span>
              <span className="text-xs text-gray-400"> ({adults} nəfər)</span>
            </p>
          )}
        </div>

        {/* WhatsApp CTA */}
        <WhatsAppButton waUrl={waUrl} hotelName={hotel.name} offerId={offerId} />
      </div>
    </article>
  );
}

// ─── WhatsApp icon (used in sticky footer) ────────────────────────────────────
function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
