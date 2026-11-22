import { notFound } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/db';
import type { Hotel, Offer } from '@/lib/types';
import { INCLUDES_META, MEAL_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import WhatsAppButton from './WhatsAppButton';
import OfferViewTracker from './OfferViewTracker';

// ─── Fallback resort image ────────────────────────────────────────────────────
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80';

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer: Offer | null = await db.getOffer(id);

  if (!offer) notFound();

  const agencyLabel = offer.agencyName?.trim() || 'Səyahət Təklifi';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Track page view */}
      <OfferViewTracker offerId={offer.id} />

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <header className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-600/20 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-800/30 rounded-full" />

        <div className="relative px-5 pt-10 pb-8 max-w-lg mx-auto">
          {/* Logo / Agency */}
          <div className="flex items-center gap-3 mb-6">
            {offer.agencyLogo ? (
              <Image
                src={offer.agencyLogo}
                alt={agencyLabel}
                width={40}
                height={40}
                className="rounded-xl object-contain bg-white/10 p-1"
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl">
                ✈️
              </div>
            )}
            <div>
              <p className="font-bold text-base leading-tight">{agencyLabel}</p>
              {offer.managerName && (
                <p className="text-blue-200 text-xs">{offer.managerName}</p>
              )}
            </div>
          </div>

          {/* Greeting */}
          <h1 className="text-2xl font-extrabold leading-snug mb-1">
            Hörmətli {offer.clientName},
          </h1>
          <p className="text-blue-100 text-sm">
            sizin üçün xüsusi seçilmiş tur paketləri aşağıdadır.
          </p>
        </div>
      </header>

      {/* ── Trip summary card ─────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 space-y-3">
          <InfoRow icon="📍" label="İstiqamət" value={offer.destination} />
          {offer.dateRange && (
            <InfoRow icon="📅" label="Tarix" value={offer.dateRange} />
          )}
          {offer.passengers && (
            <InfoRow icon="👥" label="Səyahətçilər" value={offer.passengers} />
          )}

          {/* Included services */}
          {offer.includes.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Qiymətə daxildir
              </p>
              <div className="flex flex-wrap gap-2">
                {INCLUDES_META.filter(m => offer.includes.includes(m.key)).map(m => (
                  <span
                    key={m.key}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100"
                  >
                    {m.emoji} {m.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Hotel cards ───────────────────────────────────────────────────── */}
      <section className="max-w-lg mx-auto px-4 mt-6 pb-16 space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">
          {offer.hotels.length} Otel Variantı
        </h2>

        {offer.hotels.map((hotel, i) => (
          <HotelCard
            key={i}
            hotel={hotel}
            index={i}
            offer={offer}
            offerId={offer.id}
          />
        ))}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 pt-2">
          Maraqlandığınız variant üzərinə klikləyin – menecer sizinlə əlaqə saxlayacaq.
        </p>
      </section>
    </div>
  );
}

// ─── Info row component ───────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base w-6 flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
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
          fill={i < count ? '#f59e0b' : '#e2e8f0'}
          className="w-4 h-4"
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
  hotel: Hotel;
  index: number;
  offer: Offer;
  offerId: string;
}) {
  const imageSrc = hotel.imageUrl?.trim() || FALLBACK_IMAGE;
  const symbol   = CURRENCY_SYMBOLS[hotel.currency] ?? hotel.currency;
  const mealText = MEAL_LABELS[hotel.mealType] ?? hotel.mealType;

  // Build WhatsApp message
  const waMessage = `Salam! Göndərdiyiniz təklifə baxdım. ${offer.destination} üzrə ${offer.dateRange} tarixləri üçün *${hotel.name}* (${hotel.price.toLocaleString()} ${symbol}) variantı ilə maraqlanıram.`;

  const waNumber = offer.managerWhatsapp.replace(/\D/g, '');
  const waUrl    = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <article className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-100">
      {/* Hotel image */}
      <div className="relative h-52 w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={hotel.name}
          fill
          className="object-cover"
          sizes="(max-width: 512px) 100vw, 512px"
          unoptimized={!imageSrc.startsWith('https://images.unsplash')}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Stars badge overlaid on image */}
        <div className="absolute bottom-3 left-4">
          <Stars count={hotel.stars} />
        </div>

        {/* Option number badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-blue-900 text-xs font-bold px-2.5 py-1 rounded-full">
          Variant {index + 1}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Name + meal */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
            {hotel.name}
          </h3>
          <span className="flex-shrink-0 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100 whitespace-nowrap">
            {hotel.mealType}
          </span>
        </div>

        {/* Meal description */}
        <p className="text-slate-500 text-xs">{mealText}</p>

        {/* Note */}
        {hotel.note && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <span className="text-amber-500 mt-0.5">✨</span>
            <p className="text-amber-800 text-sm font-medium leading-snug">
              {hotel.note}
            </p>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-3xl font-black text-blue-900">
            {hotel.price.toLocaleString('az-AZ')}
          </span>
          <span className="text-lg font-bold text-blue-700">{symbol}</span>
          <span className="text-xs text-slate-400 ml-auto">nəfər başına</span>
        </div>

        {/* WhatsApp CTA */}
        <WhatsAppButton waUrl={waUrl} hotelName={hotel.name} offerId={offerId} />
      </div>
    </article>
  );
}
