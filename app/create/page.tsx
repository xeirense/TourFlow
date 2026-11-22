'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Currency, MealType, Stars } from '@/lib/types';
import { INCLUDES_META, MEAL_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';

// ─── PIN gate ────────────────────────────────────────────────────────────────
// Default PIN is "1234" – override via NEXT_PUBLIC_CREATE_PIN in .env.local
const CORRECT_PIN =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_CREATE_PIN ?? '1234')
    : '1234';

const SESSION_KEY = 'tf_pin_ok';

// ─── Hotel form state ─────────────────────────────────────────────────────────
interface HotelDraft {
  name: string;
  stars: number;
  mealType: string;
  imageUrl: string;
  price: string;
  currency: Currency;
  note: string;
}

function blankHotel(): HotelDraft {
  return { name: '', stars: 5, mealType: 'AI', imageUrl: '', price: '', currency: 'USD', note: '' };
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreatePage() {
  // ── PIN ──────────────────────────────────────────────────────────────────────
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput]       = useState('');
  const [pinError, setPinError]       = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setPinVerified(true);
  }, []);

  function handlePinKey(digit: string) {
    if (digit === '⌫') {
      setPinInput(p => p.slice(0, -1));
      setPinError(false);
      return;
    }
    const next = pinInput + digit;
    setPinInput(next);
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setPinVerified(true);
      } else {
        setPinError(true);
        setTimeout(() => { setPinInput(''); setPinError(false); }, 700);
      }
    }
  }

  // ── Agency ───────────────────────────────────────────────────────────────────
  const [agencyName,      setAgencyName]      = useState('');
  const [agencyLogo,      setAgencyLogo]      = useState('');
  const [managerName,     setManagerName]     = useState('');
  const [managerWhatsapp, setManagerWhatsapp] = useState('');

  // ── Trip ─────────────────────────────────────────────────────────────────────
  const [clientName,  setClientName]  = useState('');
  const [destination, setDestination] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [nights,      setNights]      = useState('');
  const [passengers,  setPassengers]  = useState('');
  const [includes,    setIncludes]    = useState<string[]>(['flight', 'hotel']);

  // Auto-calculate nights when both dates set
  useEffect(() => {
    if (startDate && endDate) {
      const diff = Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
      );
      if (diff > 0) setNights(String(diff));
    }
  }, [startDate, endDate]);

  function toggleInclude(key: string) {
    setIncludes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }

  // ── Hotels ───────────────────────────────────────────────────────────────────
  const [hotels, setHotels] = useState<HotelDraft[]>([blankHotel()]);

  function updateHotel(i: number, patch: Partial<HotelDraft>) {
    setHotels(prev => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  function addHotel() {
    if (hotels.length < 5) setHotels(prev => [...prev, blankHotel()]);
  }

  function removeHotel(i: number) {
    if (hotels.length > 1) setHotels(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(false);
  const [offerLink, setOfferLink] = useState('');
  const [copied,    setCopied]    = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setSubmitErr('');

      const dateRange =
        startDate && endDate
          ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}${nights ? ` (${nights} gecə)` : ''}`
          : '';

      try {
        const res = await fetch('/api/offers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Send secret if configured (matches API_SECRET on server)
            ...(process.env.NEXT_PUBLIC_API_SECRET
              ? { 'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET }
              : {}),
          },
          body: JSON.stringify({
            agencyName:      agencyName.trim()      || undefined,
            agencyLogo:      agencyLogo.trim()      || undefined,
            managerName:     managerName.trim()     || undefined,
            managerWhatsapp: managerWhatsapp.trim(),
            clientName:      clientName.trim(),
            destination:     destination.trim(),
            dateRange,
            nights:     parseInt(nights) || 0,
            passengers: passengers.trim(),
            includes,
            hotels: hotels.map(h => ({
              name:     h.name.trim(),
              stars:    Number(h.stars) as Stars,
              mealType: h.mealType as MealType,
              imageUrl: h.imageUrl.trim() || undefined,
              price:    parseFloat(h.price) || 0,
              currency: h.currency,
              note:     h.note.trim() || undefined,
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Xəta baş verdi');

        setOfferLink(`${window.location.origin}/offer/${data.id}`);
      } catch (err: unknown) {
        setSubmitErr(err instanceof Error ? err.message : 'Xəta baş verdi');
      } finally {
        setLoading(false);
      }
    },
    [agencyName, agencyLogo, managerName, managerWhatsapp, clientName, destination,
     startDate, endDate, nights, passengers, includes, hotels],
  );

  function copyLink() {
    navigator.clipboard.writeText(offerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function sendToWhatsApp() {
    const number = managerWhatsapp.replace(/\D/g, '');
    const text   = encodeURIComponent(`Müştəri təklif linki:\n${offerLink}`);
    window.open(`https://wa.me/${number}?text=${text}`, '_blank');
  }

  function resetForm() {
    setOfferLink('');
    setClientName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setNights('');
    setPassengers('');
    setIncludes(['flight', 'hotel']);
    setHotels([blankHotel()]);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PIN screen
  // ─────────────────────────────────────────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xs text-center">
          <div className="text-4xl mb-3">✈️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">TourFlow</h1>
          <p className="text-sm text-slate-500 mb-6">Menecer panelinə giriş</p>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pinInput.length > i
                    ? pinError ? 'bg-red-500 border-red-500' : 'bg-blue-700 border-blue-700'
                    : 'border-slate-300'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-xs text-red-500 mb-3 -mt-3">PIN yanlışdır</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, idx) => (
              d === '' ? (
                <div key={idx} />
              ) : (
                <button
                  key={idx}
                  onClick={() => handlePinKey(d)}
                  className="h-14 rounded-2xl bg-slate-100 hover:bg-blue-50 active:bg-blue-100 font-semibold text-slate-800 text-lg transition-colors select-none"
                >
                  {d}
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Success modal
  // ─────────────────────────────────────────────────────────────────────────────
  if (offerLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Təklif hazırdır!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Aşağıdakı linki müştəriyə göndərin
          </p>

          {/* Link box */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-blue-700 font-mono break-all mb-4 select-all border border-slate-200">
            {offerLink}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={copyLink}
              className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold transition-colors"
            >
              {copied ? '✓ Kopyalandı!' : '📋 Linki kopyala'}
            </button>

            <button
              onClick={sendToWhatsApp}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                <WhatsAppIcon />
                WhatsApp-da göndər
              </span>
            </button>

            <button
              onClick={resetForm}
              className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition-colors"
            >
              + Yeni təklif yarat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main form
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <span className="text-2xl">✈️</span>
        <div>
          <h1 className="font-bold text-base leading-tight">TourFlow</h1>
          <p className="text-blue-200 text-xs">30 Saniyəlik Tur Təklifi</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

        {/* ── 1. Agency / Manager ─────────────────────────────────────── */}
        <Section title="Agentlik / Menecer məlumatları" emoji="🏢">
          <Field label="Agentliyin adı (opsional)">
            <input
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder='Boş buraxsanız "Səyahət Təklifi" görünəcək'
              className={inputCls}
            />
          </Field>
          <Field label="Agentlik loqosu URL-i (opsional)">
            <input
              type="url"
              value={agencyLogo}
              onChange={e => setAgencyLogo(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Menecerin adı">
              <input
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Ad Soyad"
                className={inputCls}
              />
            </Field>
            <Field label="WhatsApp nömrəsi *">
              <input
                type="tel"
                required
                value={managerWhatsapp}
                onChange={e => setManagerWhatsapp(e.target.value)}
                placeholder="+99450XXXXXXX"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* ── 2. Client / Trip details ─────────────────────────────────── */}
        <Section title="Müştəri və Tur məlumatları" emoji="🧳">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Müştərinin adı *">
              <input
                type="text"
                required
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Aysel xanım"
                className={inputCls}
              />
            </Field>
            <Field label="İstiqamət / Ölkə *">
              <input
                type="text"
                required
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Antalya, Türkiyə"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Başlama tarixi">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Bitmə tarixi">
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Gecə sayı">
              <input
                type="number"
                min={1}
                value={nights}
                onChange={e => setNights(e.target.value)}
                placeholder="7"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Adam sayı">
            <input
              type="text"
              value={passengers}
              onChange={e => setPassengers(e.target.value)}
              placeholder="2 böyük, 1 uşaq (3–12)"
              className={inputCls}
            />
          </Field>

          {/* Includes checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Qiymətə daxildir
            </label>
            <div className="flex flex-wrap gap-2">
              {INCLUDES_META.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleInclude(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    includes.includes(key)
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 3. Hotel blocks ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span>🏨</span> Otel variantları
            </h2>
            <span className="text-xs text-slate-400">{hotels.length}/5</span>
          </div>

          {hotels.map((hotel, i) => (
            <HotelBlock
              key={i}
              index={i}
              hotel={hotel}
              onChange={patch => updateHotel(i, patch)}
              onRemove={hotels.length > 1 ? () => removeHotel(i) : undefined}
            />
          ))}

          {hotels.length < 5 && (
            <button
              type="button"
              onClick={addHotel}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 text-slate-500 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              + Otel əlavə et
            </button>
          )}
        </div>

        {/* ── Error & Submit ───────────────────────────────────────────── */}
        {submitErr && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            ⚠️ {submitErr}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 disabled:opacity-60 text-white text-base font-bold shadow-lg shadow-blue-200 transition-all active:scale-[.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Hazırlanır...
            </span>
          ) : (
            '⚡ Təklif Linkini Yarat'
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title, emoji, children,
}: {
  title: string; emoji: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
      <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
        <span>{emoji}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

interface HotelBlockProps {
  index: number;
  hotel: HotelDraft;
  onChange: (patch: Partial<HotelDraft>) => void;
  onRemove?: () => void;
}

function HotelBlock({ index, hotel, onChange, onRemove }: HotelBlockProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700 text-sm">
          Variant {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Sil ✕
          </button>
        )}
      </div>

      {/* Name & Stars */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Otelin adı *">
            <input
              type="text"
              required
              value={hotel.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Regnum Carya Hotel"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Ulduz">
          <select
            value={hotel.stars}
            onChange={e => onChange({ stars: parseInt(e.target.value) })}
            className={inputCls}
          >
            <option value={3}>3 ★</option>
            <option value={4}>4 ★</option>
            <option value={5}>5 ★</option>
          </select>
        </Field>
      </div>

      {/* Meal type */}
      <Field label="Qidalanma tipi">
        <select
          value={hotel.mealType}
          onChange={e => onChange({ mealType: e.target.value })}
          className={inputCls}
        >
          {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>

      {/* Price & Currency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Qiymət *">
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={hotel.price}
              onChange={e => onChange({ price: e.target.value })}
              placeholder="1200"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Valyuta">
          <select
            value={hotel.currency}
            onChange={e => onChange({ currency: e.target.value as Currency })}
            className={inputCls}
          >
            {(['AZN','USD','EUR'] as Currency[]).map(c => (
              <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Image URL */}
      <Field label="Otel şəkli URL-i (opsional)">
        <input
          type="url"
          value={hotel.imageUrl}
          onChange={e => onChange({ imageUrl: e.target.value })}
          placeholder="https://... (boş qalsa standart şəkil)"
          className={inputCls}
        />
      </Field>

      {/* Note */}
      <Field label="Qısa özəllik / Qeyd">
        <input
          type="text"
          value={hotel.note}
          onChange={e => onChange({ note: e.target.value })}
          placeholder="Dənizə 0 məsafə, uşaqlar üçün aquapark"
          className={inputCls}
        />
      </Field>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
