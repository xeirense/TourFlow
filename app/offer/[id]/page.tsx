import { notFound } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/db';
import type { Hotel, Offer } from '@/lib/types';
import { INCLUDES_META, MEAL_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import WhatsAppButton from './WhatsAppButton';
import OfferViewTracker from './OfferViewTracker';
import CustomerResponse from './CustomerResponse';

// Cycling fallback images (beach, pool, luxury room, resort, city hotel)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
  'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
];

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer: Offer | null = await db.getOffer(id);

  if (!offer) notFound();

  // ── Expiry check ────────────────────────────────────────────────────────────
  const isExpired = offer.expiresAt ? new Date(offer.expiresAt) < new Date() : false;

  const agencyLabel = offer.agencyName?.trim() || 'Səyahət Təklifi';
  const waNumber    = offer.managerWhatsapp.replace(/\D/g, '');
  const waUrl       = `https://wa.me/${waNumber}`;

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="text-6xl">⌛</div>
          <h1 className="text-white text-xl font-bold">Təklif müddəti bitib</h1>
          <p className="text-slate-400 text-sm">
            Bu təklif artıq aktiv deyil. Yeni qiymətlər üçün {agencyLabel} ilə
            birbaşa əlaqə saxlayın.
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors"
          >
            <WaIcon /> Menecer ilə əlaqə
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans">
      <OfferViewTracker offerId={offer.id} />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="bg-[#0F172A] border-b border-white/5 px-5 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {offer.agencyLogo ? (
            <Image
              src={offer.agencyLogo}
              alt={agencyLabel}
              width={44}
              height={44}
              className="rounded-xl object-contain"
              unoptimized
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold text-white">
              {agencyLabel.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-white text-sm leading-tight">{agencyLabel}</p>
            {offer.managerName && (
              <p className="text-slate-400 text-xs">{offer.managerName}</p>
            )}
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">Xüsusi Təklif</p>
            <p className="text-teal-400 text-xs font-semibold">Premium</p>
          </div>
        </div>
      </header>

      {/* ── Greeting + Summary band ───────────────────────────────────── */}
      <div className="bg-[#1E293B] border-b border-white/5">
        <div className="max-w-lg mx-auto px-5 py-5">
          <h1 className="text-white text-xl font-extrabold leading-snug mb-1">
            Hörmətli {offer.clientName},
          </h1>
          <p className="text-slate-400 text-sm mb-4">
            sizin üçün xüsusi hazırlanmış tur paketi
          </p>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            <Chip icon="📍" text={offer.destination} />
            {offer.dateRange && <Chip icon="📅" text={offer.dateRange} />}
            {offer.nights > 0 && <Chip icon="🌙" text={`${offer.nights} gecə`} />}
            {offer.passengers && <Chip icon="👥" text={offer.passengers} />}
          </div>

          {/* Included services */}
          {offer.includes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {INCLUDES_META.filter(m => offer.includes.includes(m.key)).map(m => (
                <span
                  key={m.key}
                  className="inline-flex items-center gap-1 bg-teal-900/40 text-teal-300 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-700/30"
                >
                  {m.emoji} {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hotel cards ───────────────────────────────────────────────── */}
      <section className="max-w-lg mx-auto px-4 py-5 pb-28 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">
          {offer.hotels.length} Otel Variantı
        </p>

        {offer.hotels.map((hotel, i) => (
          <HotelCard
            key={i}
            hotel={hotel}
            index={i}
            offer={offer}
            offerId={offer.id}
            fallbackImage={FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]}
          />
        ))}

        {/* Customer feedback response */}
        <CustomerResponse offerId={offer.id} />

        {/* Validity note */}
        <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/30 rounded-2xl px-4 py-3">
          <span className="text-amber-400 text-base mt-0.5">⏰</span>
          <p className="text-amber-300 text-xs leading-relaxed">
            Qiymətlər dəyişə bilər. Yerlər məhdud olduğundan vaxtında müraciət etmənizi tövsiyə edirik.
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 pt-1">
          Maraqlandığınız variant üzərinə klikləyin – menecer sizinlə əlaqə saxlayacaq.
        </p>
      </section>

      {/* ── Sticky WhatsApp footer bar ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0F172A]/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-900/30 active:scale-[.98] transition-all"
          >
            <WaIcon />
            Menecer ilə əlaqə saxla
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Chip component ───────────────────────────────────────────────────────────
function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full border border-white/10">
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
          fill={i < count ? '#f59e0b' : '#334155'}
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
  fallbackImage,
}: {
  hotel: Hotel;
  index: number;
  offer: Offer;
  offerId: string;
  fallbackImage: string;
}) {
  const imageSrc   = hotel.imageUrl?.trim() || fallbackImage;
  const symbol     = CURRENCY_SYMBOLS[hotel.currency] ?? hotel.currency;
  const mealText   = MEAL_LABELS[hotel.mealType] ?? hotel.mealType;
  const priceLabel = hotel.priceType === 'total' ? 'Ümumi paket' : 'Nəfər başına';

  const waMessage = `Salam! Göndərdiyiniz təklifə baxdım. ${offer.destination} üzrə ${offer.dateRange} tarixləri üçün *${hotel.name}* (${hotel.price.toLocaleString()} ${symbol}) variantı ilə maraqlanıram.`;
  const waNumber  = offer.managerWhatsapp.replace(/\D/g, '');
  const waUrl     = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <article className="bg-[#1E293B] rounded-3xl overflow-hidden border border-white/5 shadow-xl">
      {/* Hotel image */}
      <div className="relative h-[280px] w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={hotel.name}
          fill
          className="object-cover"
          sizes="(max-width: 512px) 100vw, 512px"
          unoptimized={!imageSrc.includes('unsplash.com')}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-[#1E293B]/20 to-transparent" />

        {/* Variant badge */}
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
          Variant {index + 1}
        </div>

        {/* Stars + meal overlaid on image */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Stars count={hotel.stars} />
          <span className="bg-black/50 backdrop-blur-sm text-xs text-white font-bold px-2 py-0.5 rounded-full border border-white/20">
            {hotel.mealType}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 pb-5 pt-2 space-y-3">
        {/* Hotel name */}
        <div>
          <h3 className="text-white font-extrabold text-xl leading-tight">
            {hotel.name}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">{mealText}</p>
        </div>

        {/* Note */}
        {hotel.note && (
          <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-xl px-3 py-2.5">
            <span className="text-amber-400 text-sm mt-0.5">✨</span>
            <p className="text-amber-200 text-sm font-medium leading-snug">
              {hotel.note}
            </p>
          </div>
        )}

        {/* Price block */}
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-4xl font-black text-white tracking-tight">
            {hotel.price.toLocaleString('az-AZ')}
          </span>
          <span className="text-2xl font-bold text-teal-400">{symbol}</span>
          <span className="text-xs text-slate-500 ml-2 self-end pb-0.5">{priceLabel}</span>
        </div>

        {/* WhatsApp CTA */}
        <WhatsAppButton waUrl={waUrl} hotelName={hotel.name} offerId={offerId} />
      </div>
    </article>
  );
}

// ─── WhatsApp icon (for sticky footer) ───────────────────────────────────────
function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
