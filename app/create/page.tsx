'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Currency, MealType, Stars, OfferTemplate } from '@/lib/types';
import { INCLUDES_META, MEAL_LABELS, CURRENCY_SYMBOLS } from '@/lib/types';
import ClientCombobox, { type ClientHit } from '@/app/dashboard/clients/ClientCombobox';
import HotelCombobox, { type HotelHit } from '@/app/create/HotelCombobox';
import { normalizePhone } from '@/lib/phone';

const SUPPORT_WA = process.env.NEXT_PUBLIC_SUPPORT_WA ?? '';

// ─── Built-in seed templates (Growth+, non-deletable) ────────────────────────
const SEED_TEMPLATES = [
  { id: 'seed-antalya',  name: 'Antalya 7 gecə',  destination: 'Antalya, Türkiyə',   nights: 7, includes: ['flight', 'hotel', 'meal', 'transfer'] },
  { id: 'seed-dubai',    name: 'Dubai 5 gecə',    destination: 'Dubai, BƏƏ',         nights: 5, includes: ['flight', 'hotel', 'meal'] },
  { id: 'seed-georgia',  name: 'Gürcüstan 3 gecə', destination: 'Tbilisi, Gürcüstan', nights: 3, includes: ['hotel', 'transfer'] },
  { id: 'seed-egypt',    name: 'Misir 7 gecə',    destination: 'Hurgada, Misir',      nights: 7, includes: ['flight', 'hotel', 'meal', 'transfer'] },
  { id: 'seed-maldives', name: 'Maldiv 7 gecə',   destination: 'Maldiv adaları',     nights: 7, includes: ['flight', 'hotel', 'meal', 'transfer', 'insurance'] },
];

// ─── Preset hotel images ──────────────────────────────────────────────────────
const PRESET_IMAGES = [
  { label: 'Çimərlik', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80' },
  { label: 'Hovuz',    url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80' },
  { label: 'Otaq',     url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80' },
  { label: 'Resort',   url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80' },
  { label: 'Şəhər',   url: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80' },
];

// ─── Hotel form state ─────────────────────────────────────────────────────────
interface HotelDraft {
  name: string;
  stars: number;
  mealType: string;
  imageUrl: string;
  price: string;
  currency: Currency;
  priceType: 'per_person' | 'total';
  note: string;
  // Catalog enrichment (V7)
  city: string;
  country: string;
  catalogHotelId: string | null;
  sharePhoto: boolean;
}

function blankHotel(): HotelDraft {
  return { name: '', stars: 5, mealType: 'AI', imageUrl: '', price: '', currency: 'AZN', priceType: 'per_person', note: '', city: '', country: '', catalogHotelId: null, sharePhoto: false };
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreatePageContent />
    </Suspense>
  );
}

function CreatePageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const duplicateId  = searchParams.get('from');
  const isAlt        = searchParams.get('alt') === '1'; // alternative offer mode

  // ── Agency (auto-filled from profile) ────────────────────────────────────────
  const [agencyName,      setAgencyName]      = useState('');
  const [agencyLogo,      setAgencyLogo]      = useState('');
  const [managerName,     setManagerName]     = useState('');
  const [managerWhatsapp, setManagerWhatsapp] = useState('');
  const [profileLoaded,   setProfileLoaded]   = useState(false);

  // Load agency profile on mount
  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(p => {
        if (p.agency_name)  setAgencyName(p.agency_name);
        if (p.agency_logo)  setAgencyLogo(p.agency_logo);
        if (p.whatsapp)     setManagerWhatsapp(p.whatsapp);
        if (p.manager_name) setManagerName(p.manager_name);
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, []);

  // ── Plan permissions ──────────────────────────────────────────────────────────
  const [planFeatures, setPlanFeatures] = useState<{
    templates: boolean;
    alternativeOffer: boolean;
  }>({ templates: true, alternativeOffer: true }); // optimistic defaults

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        if (d.features) setPlanFeatures({
          templates:        d.features.templates,
          alternativeOffer: d.features.alternativeOffer,
        });
      })
      .catch(() => {});
  }, []);

  // ── Templates ─────────────────────────────────────────────────────────────────
  const [templates,        setTemplates]        = useState<OfferTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateSaved,    setTemplateSaved]    = useState(false);
  const [deletingTemplId,  setDeletingTemplId]  = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => {});
  }, []);

  function applyTemplate(t: { destination: string; nights: number; includes: string[] }) {
    setDestination(t.destination);
    setNights(String(t.nights));
    setIncludes(t.includes as string[]);
  }

  async function handleSaveTemplate() {
    if (!templateNameInput.trim()) return;
    try {
      const res = await fetch('/api/templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        templateNameInput.trim(),
          destination: destination.trim(),
          nights:      parseInt(nights) || 7,
          includes,
        }),
      });
      if (res.ok) {
        const t = await res.json();
        setTemplates(prev => [t, ...prev]);
        setTemplateSaved(true);
        setTimeout(() => { setShowSaveTemplate(false); setTemplateSaved(false); setTemplateNameInput(''); }, 1800);
      }
    } catch {}
  }

  async function handleDeleteTemplate(id: string) {
    setDeletingTemplId(id);
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch {}
    setDeletingTemplId(null);
  }

  // ── Mobile keyboard detection (visualViewport) ───────────────────────────────
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      setKeyboardOpen((vv!.height ?? window.innerHeight) < window.innerHeight * 0.75);
    }
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // ── Trip ─────────────────────────────────────────────────────────────────────
  const [clientName,     setClientName]     = useState('');
  const [clientPhone,    setClientPhone]    = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dupClient, setDupClient] = useState<{ id: string; name: string } | null>(null);
  const dupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [destination, setDestination] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [nights,      setNights]      = useState('');
  const [adults,      setAdults]      = useState(2);
  const [children,    setChildren]    = useState(0);
  const [passengers,  setPassengers]  = useState('2 böyük');
  const [expiryDays,  setExpiryDays]  = useState('3');
  const [includes,    setIncludes]    = useState<string[]>(['flight', 'hotel']);

  // ── Hotels ───────────────────────────────────────────────────────────────────
  const [hotels, setHotels] = useState<HotelDraft[]>([blankHotel()]);

  // Auto-calculate nights when both dates set
  useEffect(() => {
    if (startDate && endDate) {
      const diff = Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
      );
      if (diff > 0) setNights(String(diff));
    }
  }, [startDate, endDate]);

  // Auto-build passengers string from adults + children counts
  useEffect(() => {
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} böyük`);
    if (children > 0) parts.push(`${children} uşaq (2–12)`);
    setPassengers(parts.join(', '));
  }, [adults, children]);

  // Debounced duplicate phone check — skip if a client is already selected
  useEffect(() => {
    if (selectedClientId) { setDupClient(null); return; }
    clearTimeout(dupTimer.current);
    const norm = normalizePhone(clientPhone);
    if (norm.length < 10) { setDupClient(null); return; }
    dupTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/clients?phone_exact=${encodeURIComponent(norm)}`);
        const data = await res.json();
        if (data?.id) {
          setDupClient({ id: data.id, name: data.full_name });
        } else {
          setDupClient(null);
        }
      } catch { setDupClient(null); }
    }, 600);
    return () => clearTimeout(dupTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPhone, selectedClientId]);

  // Load duplicate offer data if ?from=ID is set
  useEffect(() => {
    if (!duplicateId) return;
    fetch(`/api/offers/${duplicateId}`)
      .then(r => r.json())
      .then(offer => {
        if (!offer || offer.error) return;
        setDestination(offer.destination ?? '');
        setNights(String(offer.nights ?? ''));
        // Parse adult/child counts from passengers string
        const pax = offer.passengers ?? '';
        const adultsMatch   = pax.match(/(\d+)\s*böyük/);
        const childrenMatch = pax.match(/(\d+)\s*uşaq/);
        if (adultsMatch)   setAdults(parseInt(adultsMatch[1]));
        if (childrenMatch) setChildren(parseInt(childrenMatch[1]));
        setIncludes(offer.includes ?? ['flight', 'hotel']);
        if (offer.hotels?.length) {
          setHotels(offer.hotels.map((h: HotelDraft & { price: number }) => ({
            name:      h.name,
            stars:     h.stars,
            mealType:  h.mealType,
            imageUrl:  h.imageUrl ?? '',
            price:     String(h.price),
            currency:  h.currency,
            priceType: h.priceType ?? 'per_person',
            note:      h.note ?? '',
          })));
        }
        // If alternative mode, clear hotels so menecer adds cheaper ones
        if (isAlt) {
          setHotels([blankHotel()]);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateId]);

  function toggleInclude(key: string) {
    setIncludes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }

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
  const [waMsg,     setWaMsg]     = useState('');
  const [waCopied,  setWaCopied]  = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setSubmitErr('');

      // ── Azerbaijani client-side validation ────────────────────────────────
      if (!clientName.trim())      { setSubmitErr('Müştərinin adı tələb olunur');    setLoading(false); return; }
      if (!destination.trim())     { setSubmitErr('İstiqamət tələb olunur');          setLoading(false); return; }
      if (!managerWhatsapp.trim()) { setSubmitErr('Menecerin WhatsApp nömrəsi tələb olunur'); setLoading(false); return; }
      for (const h of hotels) {
        if (!h.name.trim()) { setSubmitErr('Otelin adı tələb olunur'); setLoading(false); return; }
        if (!h.price || parseFloat(h.price) <= 0) { setSubmitErr(`"${h.name || 'Otel'}" üçün qiymət sıfırdan böyük olmalıdır`); setLoading(false); return; }
      }

      const dateRange =
        startDate && endDate
          ? `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}${nights ? ` (${nights} gecə)` : ''}`
          : '';

      try {
        // Create a new client record if no existing client was selected
        let resolvedClientId = selectedClientId;
        if (!resolvedClientId && clientName.trim()) {
          const clientRes = await fetch('/api/clients', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              fullName:  clientName.trim(),
              phone:     clientPhone.trim() || '',
              travelers: { adults, children, child_ages: [] },
              source:    'whatsapp',
            }),
          });
          if (clientRes.ok) {
            const newClient = await clientRes.json();
            resolvedClientId = newClient.id ?? null;
          }
        }

        const res = await fetch('/api/offers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
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
              name:           h.name.trim(),
              stars:          Number(h.stars) as Stars,
              mealType:       h.mealType as MealType,
              imageUrl:       h.imageUrl.trim() || undefined,
              price:          parseFloat(h.price) || 0,
              currency:       h.currency,
              priceType:      h.priceType,
              note:           h.note.trim() || undefined,
              city:           h.city.trim() || undefined,
              country:        h.country.trim() || undefined,
              catalogHotelId: h.catalogHotelId ?? undefined,
              sharePhoto:     h.sharePhoto && !!h.imageUrl,
            })),
            // Alternative offer linking
            parentOfferId: isAlt && duplicateId ? duplicateId : undefined,
            clientPhone:   clientPhone.trim() || undefined,
            expiryDays:    parseInt(expiryDays) || 3,
            clientId:      resolvedClientId ?? undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Xəta baş verdi');

        const link = `${window.location.origin}/offer/${data.id}`;
        setOfferLink(link);

        // Build natural WA message
        const msgLines = [
          `Salam ${clientName.trim()}! 👋`,
          '',
          `${destination.trim()} üzrə xüsusi hazırladığım tur paketi göndərdim.`,
          '',
          ...(dateRange       ? [`📅 Tarix: ${dateRange}`] : []),
          ...(nights          ? [`🌙 Müddət: ${nights} gecə`] : []),
          `🏨 ${hotels.length} otel variantı`,
          '',
          '👇 Baxmaq üçün link:',
          link,
          '',
          'Sualınız olsa, yazın! 🤝',
        ];
        setWaMsg(msgLines.join('\n'));
      } catch (err: unknown) {
        setSubmitErr(err instanceof Error ? err.message : 'Xəta baş verdi');
      } finally {
        setLoading(false);
      }
    },
    [agencyName, agencyLogo, managerName, managerWhatsapp, clientName, clientPhone,
     destination, startDate, endDate, nights, adults, children, passengers, expiryDays,
     includes, hotels, isAlt, duplicateId],
  );

  function copyLink() {
    navigator.clipboard.writeText(offerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function copyWaMsg() {
    navigator.clipboard.writeText(waMsg).catch(() => {});
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2200);
  }

  function sendWaMsg() {
    const phone = clientPhone.replace(/\D/g, '');
    // If client phone provided → open their chat; otherwise open universal picker
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
    window.open(url, '_blank');
  }

  function resetForm() {
    setOfferLink('');
    setClientName('');
    setClientPhone('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setNights('');
    setAdults(2);
    setChildren(0);
    setExpiryDays('3');
    setIncludes(['flight', 'hotel']);
    setHotels([blankHotel()]);
    setWaMsg('');
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Success modal
  // ─────────────────────────────────────────────────────────────────────────────
  if (offerLink) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 py-8">
        <div className="bg-[#1E293B] border border-white/5 rounded-3xl shadow-2xl p-6 w-full max-w-sm">

          {/* Header */}
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-lg font-bold text-white">Təklif hazırdır!</h2>
            {isAlt && (
              <span className="inline-block mt-1.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                ↩ Alternativ Təklif
              </span>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Aşağıdakı linki müştəriyə göndərin
            </p>
          </div>

          {/* Link box */}
          <div className="bg-white/5 rounded-xl p-3 text-xs text-teal-400 font-mono break-all mb-4 select-all border border-white/10">
            {offerLink}
          </div>

          <div className="flex gap-2 mb-5">
            <button
              onClick={copyLink}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-colors"
            >
              {copied ? '✓ Kopyalandı' : '📋 Linki kopyala'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors text-center"
            >
              📊 Dashboard
            </Link>
          </div>

          {/* ── WhatsApp Message Generator ──────────────────────────────── */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              📱 Müştəriyə göndəriləcək mesaj
            </p>
            <textarea
              value={waMsg}
              onChange={e => setWaMsg(e.target.value)}
              rows={9}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono leading-relaxed"
            />
            <div className="flex gap-2">
              <button
                onClick={copyWaMsg}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  waCopied
                    ? 'bg-teal-500/30 text-teal-300'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {waCopied ? '✓ Kopyalandı' : '📋 Kopyala'}
              </button>
              <button
                onClick={sendWaMsg}
                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <WaIcon /> Göndər
              </button>
            </div>
          </div>

          {/* ── Save as template ────────────────────────────────────────── */}
          <div className="border-t border-white/10 pt-4 mt-2">
            {!showSaveTemplate ? (
              <button
                onClick={() => planFeatures.templates ? setShowSaveTemplate(true) : undefined}
                disabled={!planFeatures.templates}
                className={`w-full py-2.5 rounded-xl border border-white/10 font-medium text-sm transition-colors ${
                  planFeatures.templates
                    ? 'hover:bg-white/5 text-slate-400 hover:text-slate-300'
                    : 'opacity-40 cursor-not-allowed text-slate-500'
                }`}
              >
                {planFeatures.templates ? '💾 Şablon kimi yadda saxla' : '🔒 Şablon (Growth+)'}
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={e => setTemplateNameInput(e.target.value)}
                  placeholder="Şablon adı (məs. Antalya 7 gecə)"
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTemplate}
                    className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-colors"
                  >
                    {templateSaved ? '✓ Saxlandı!' : 'Saxla'}
                  </button>
                  <button
                    onClick={() => { setShowSaveTemplate(false); setTemplateNameInput(''); }}
                    className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 text-sm transition-colors"
                  >
                    Ləğv et
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetForm}
            className="w-full mt-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 font-medium text-sm transition-colors"
          >
            + Yeni təklif yarat
          </button>
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
      <header className="bg-[#0F172A] border-b border-white/5 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-base">✈️</div>
        <div className="flex-1">
          <h1 className="font-bold text-sm leading-tight">TourFlow</h1>
          <p className="text-slate-500 text-xs">
            {isAlt ? '↩ Alternativ Büdcəyə Uyğun Təklif' : '30 Saniyəlik Tur Təklifi'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          📊 Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          Çıxış
        </button>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

        {/* ── 0. Templates ─────────────────────────────────────────────── */}
        {!planFeatures.templates ? (
          <div className="bg-white rounded-2xl shadow-sm border border-dashed border-slate-200 p-4 flex items-center gap-3 opacity-70">
            <span className="text-xl">💾</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-500">Tur Şablonları</p>
              <p className="text-xs text-slate-400">Bu funksiya Growth paketindən aktivdir</p>
            </div>
            <span className="text-lg">🔒</span>
          </div>
        ) : templates.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide mb-3">
              <span>💾</span> Şablonlar
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* Built-in seed templates — not deletable */}
              {SEED_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="flex items-center gap-1.5 bg-teal-50 border border-teal-100 rounded-xl px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  🌍 {t.name}
                </button>
              ))}
              {/* User-saved templates */}
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl pr-1 pl-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="text-sm font-semibold text-slate-700 hover:text-teal-600 transition-colors"
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(t.id)}
                    disabled={deletingTemplId === t.id}
                    className="ml-1 text-xs text-slate-300 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Şablona basın → istiqamət, gecə sayı və xidmətlər avtomatik dolur
            </p>
          </div>
        ) : null}

        {/* Alternative offer notice */}
        {isAlt && duplicateId && (
          planFeatures.alternativeOffer ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-amber-500 text-lg flex-shrink-0">↩</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Alternativ / Büdcəyə Uyğun Təklif</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Əvvəlki təklif ilə əlaqəli yeni otel variantları əlavə edin.
                  Müştəri məlumatları artıq dolduruldu.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🔒</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Alternativ Təklif — Growth Paketi Lazımdır</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  1-kliklə alternativ təklif yaratma Growth paketindən aktivdir.
                </p>
                {SUPPORT_WA && (
                  <a
                    href={`https://wa.me/${SUPPORT_WA.replace(/\D/g, '')}?text=${encodeURIComponent('Salam! TourFlow Growth paketinə keçmək istəyirəm.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-bold text-amber-700 underline"
                  >
                    Growth paketinə keç →
                  </a>
                )}
              </div>
            </div>
          )
        )}

        {/* ── 1. Agency / Manager ─────────────────────────────────────── */}
        <Section title="Agentlik / Menecer məlumatları" emoji="🏢">
          {!profileLoaded && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              Profil yüklənir...
            </p>
          )}
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
              <ClientCombobox
                value={clientName}
                selectedId={selectedClientId}
                onChange={name => { setClientName(name); setSelectedClientId(null); }}
                onSelect={(c: ClientHit) => {
                  setClientName(c.full_name);
                  setClientPhone(c.phone);
                  setAdults(c.travelers.adults ?? 2);
                  setChildren(c.travelers.children ?? 0);
                  setSelectedClientId(c.id);
                }}
                onClear={() => { setSelectedClientId(null); }}
                inputClassName={inputCls}
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

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={startDate && endDate ? 'Gecə sayı (avtomatik)' : 'Gecə sayı'}>
              <input
                type="number"
                min={1}
                value={nights}
                readOnly={!!(startDate && endDate)}
                onChange={e => { if (!(startDate && endDate)) setNights(e.target.value); }}
                placeholder="7"
                className={`${inputCls} ${startDate && endDate ? 'bg-slate-100 cursor-default text-slate-500' : ''}`}
              />
            </Field>
            <Field label="Bitmə müddəti">
              <select
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                className={inputCls}
              >
                <option value="1">1 gün</option>
                <option value="3">3 gün (tövsiyə)</option>
                <option value="7">7 gün</option>
                <option value="14">14 gün</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Böyüklər">
              <input
                type="number"
                min={1}
                max={20}
                value={adults}
                onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                className={inputCls}
              />
            </Field>
            <Field label="Uşaqlar (2–12 yaş)">
              <input
                type="number"
                min={0}
                max={10}
                value={children}
                onChange={e => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                className={inputCls}
              />
            </Field>
            <Field label="Müştərinin WA (opsional)">
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+99450..."
                className={inputCls}
              />
            </Field>
          </div>

          {/* Duplicate phone notice */}
          {dupClient && !selectedClientId && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-800">
                ⚠️ Bu nömrə artıq <strong>{dupClient.name}</strong> kartında var.
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={`/dashboard/clients/${dupClient.id}`}
                  target="_blank"
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Kartı aç
                </a>
                <button
                  type="button"
                  onClick={() => setDupClient(null)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Yenə də yeni kart
                </button>
              </div>
            </div>
          )}

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
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
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
              <span>🏨</span> {isAlt ? 'Büdcəyə uyğun otel variantları' : 'Otel variantları'}
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

        {/* ── Error ──────────────────────────────────────────────────── */}
        {submitErr && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            ⚠️ {submitErr}
          </div>
        )}

        {/* Inline submit button (always visible in form flow) */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#0F172A] border border-teal-500/50 hover:border-teal-400 disabled:opacity-60 text-white text-base font-bold shadow-lg transition-all active:scale-[.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Hazırlanır...
            </span>
          ) : (
            isAlt ? '↩ Alternativ Linkini Yarat' : '⚡ Təklif Linkini Yarat'
          )}
        </button>
      </form>

      {/* Sticky bottom submit bar — hidden when mobile keyboard is open */}
      {!keyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0F172A]/95 backdrop-blur-sm border-t border-white/5 px-4 py-3 safe-area-pb md:hidden">
          <button
            form="create-form"
            type="submit"
            disabled={loading}
            onClick={() => { const f = document.querySelector('form'); f?.requestSubmit(); }}
            className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-sm font-bold shadow-lg transition-all active:scale-[.98]"
          >
            {loading
              ? '⏳ Hazırlanır...'
              : isAlt ? '↩ Alternativ Linkini Yarat' : '⚡ Təklif Linkini Yarat'}
          </button>
        </div>
      )}
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
  index:    number;
  hotel:    HotelDraft;
  onChange: (patch: Partial<HotelDraft>) => void;
  onRemove?: () => void;
}

interface LastPrice {
  price: number;
  currency: string;
  priceType: string;
  mealType: string | null;
  offeredAt: string;
}

function HotelBlock({ index, hotel, onChange, onRemove }: HotelBlockProps) {
  const [uploading,  setUploading]  = useState(false);
  const [lastPrice,  setLastPrice]  = useState<LastPrice | null>(null);

  // Fetch last price when a catalog hotel is selected
  useEffect(() => {
    if (!hotel.catalogHotelId && !hotel.name) { setLastPrice(null); return; }
    const params = hotel.catalogHotelId
      ? `hotelId=${encodeURIComponent(hotel.catalogHotelId)}`
      : `name=${encodeURIComponent(hotel.name)}&city=${encodeURIComponent(hotel.city ?? '')}`;
    fetch(`/api/hotels/last-price?${params}`)
      .then(r => r.json())
      .then(d => setLastPrice(d ?? null))
      .catch(() => setLastPrice(null));
  }, [hotel.catalogHotelId, hotel.name, hotel.city]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) onChange({ imageUrl: data.url });
    } catch {}
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700 text-sm">Variant {index + 1}</span>
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
            <HotelCombobox
              value={hotel.name}
              selectedId={hotel.catalogHotelId}
              inputClassName={inputCls}
              onChange={name => onChange({ name, catalogHotelId: null, city: '', country: '' })}
              onClear={() => onChange({ catalogHotelId: null })}
              onSelect={(h: HotelHit) => onChange({
                name:           h.name,
                stars:          h.stars as 3 | 4 | 5,
                mealType:       h.default_meal,
                city:           h.city,
                country:        h.country,
                catalogHotelId: h.id,
                note:           h.description_az ?? hotel.note,
                imageUrl:       (h.photos[0] ?? hotel.imageUrl),
              })}
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

      {/* City / Country (auto-filled from catalog, editable) */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Şəhər">
          <input
            type="text"
            value={hotel.city}
            onChange={e => onChange({ city: e.target.value })}
            placeholder="Belek"
            className={inputCls}
          />
        </Field>
        <Field label="Ölkə">
          <input
            type="text"
            value={hotel.country}
            onChange={e => onChange({ country: e.target.value })}
            placeholder="Türkiyə"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Meal type — quick chips */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Qidalanma tipi
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(MEAL_LABELS) as MealType[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => onChange({ mealType: k })}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                hotel.mealType === k
                  ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {MEAL_LABELS[hotel.mealType as MealType] ?? hotel.mealType}
        </p>
      </div>

      {/* Price, Currency & Price type */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
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
            {(['AZN', 'USD', 'EUR'] as Currency[]).map(c => (
              <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
            ))}
          </select>
        </Field>
        <Field label="Qiymət növü">
          <select
            value={hotel.priceType}
            onChange={e => onChange({ priceType: e.target.value as 'per_person' | 'total' })}
            className={inputCls}
          >
            <option value="per_person">Nəfər başına</option>
            <option value="total">Ümumi paket</option>
          </select>
        </Field>
      </div>

      {/* Last-price hint */}
      {lastPrice && !hotel.price && (() => {
        const daysAgo = Math.floor((Date.now() - new Date(lastPrice.offeredAt).getTime()) / 86_400_000);
        const isOld   = daysAgo > 60;
        return (
          <button
            type="button"
            onClick={() => onChange({
              price:     String(lastPrice.price),
              currency:  lastPrice.currency as Currency,
              priceType: lastPrice.priceType as 'per_person' | 'total',
              ...(lastPrice.mealType ? { mealType: lastPrice.mealType } : {}),
            })}
            className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
              isOld
                ? 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                : 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            💡 Son qiymət: <strong>{lastPrice.price} {lastPrice.currency}</strong>
            {lastPrice.priceType === 'per_person' ? ' / nəfər' : ' ümumi'}
            {lastPrice.mealType ? ` · ${lastPrice.mealType}` : ''}
            <span className="ml-1 text-slate-400">({daysAgo} gün əvvəl{isOld ? ' — köhnəlib' : ''})</span>
          </button>
        );
      })()}

      {/* Image section */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Otel şəkli
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESET_IMAGES.map(preset => (
            <button
              key={preset.url}
              type="button"
              onClick={() => onChange({ imageUrl: preset.url })}
              title={preset.label}
              className={`flex-shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                hotel.imageUrl === preset.url
                  ? 'border-blue-500 ring-2 ring-blue-300'
                  : 'border-transparent hover:border-slate-300'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preset.url.replace('w=800', 'w=100')}
                alt={preset.label}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0">
            <span>📁</span>
            {uploading ? 'Yüklənir...' : 'Fayl seç'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
          <span className="text-xs text-slate-400">maks. 5 MB</span>
        </div>
        <input
          type="url"
          value={hotel.imageUrl}
          onChange={e => onChange({ imageUrl: e.target.value })}
          placeholder="Və ya şəkil URL-i yapışdırın..."
          className={inputCls}
        />

        {/* Photo share checkbox — only for uploaded photos (not Unsplash presets) */}
        {hotel.imageUrl && !hotel.imageUrl.startsWith('https://images.unsplash.com') && (
          <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={hotel.sharePhoto}
              onChange={e => onChange({ sharePhoto: e.target.checked })}
              className="w-3.5 h-3.5 rounded accent-teal-500"
            />
            <span className="text-xs text-slate-500">
              Bu şəkli digər agentliklərlə paylaş (kataloqa əlavə et)
            </span>
          </label>
        )}
      </div>

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

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
