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
import Icon, { INCLUDE_ICON, type IconName } from '@/app/components/Icon';
import { PageTitle } from '@/app/components/AppHeader';
import { WaIcon } from '@/app/dashboard/WhatsAppMsgButton';

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
      <div className="min-h-screen bg-ink flex items-center justify-center">
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
          } else if (clientRes.status === 409) {
            // Phone already belongs to a client — link the offer to that card
            // instead of leaving it without a client.
            const dup = await clientRes.json().catch(() => null);
            resolvedClientId = dup?.existingId ?? null;
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


  // ─────────────────────────────────────────────────────────────────────────────
  // Success modal
  // ─────────────────────────────────────────────────────────────────────────────
  if (offerLink) {
    return (
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        <div className="card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
              <Icon name="check" className="w-5 h-5" strokeWidth={2.25} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-ink">Təklif hazırdır</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isAlt ? 'Alternativ təklif yaradıldı. ' : ''}Linki müştəriyə göndərin.
              </p>
            </div>
          </div>

          {/* Link */}
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1.5">
            <Icon name="link" className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="flex-1 min-w-0 text-sm text-ink truncate select-all">{offerLink}</span>
            <button onClick={copyLink} className="btn btn-sm btn-secondary">
              <Icon name={copied ? 'check' : 'copy'} className="w-3.5 h-3.5" />
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>

          {/* WhatsApp message */}
          <div className="mt-6">
            <label className="label">Müştəriyə göndəriləcək mesaj</label>
            <textarea
              value={waMsg}
              onChange={e => setWaMsg(e.target.value)}
              rows={9}
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-ink resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 leading-relaxed"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={copyWaMsg} className="btn btn-md btn-secondary flex-1">
                <Icon name={waCopied ? 'check' : 'copy'} className="w-4 h-4" />
                {waCopied ? 'Kopyalandı' : 'Mesajı kopyala'}
              </button>
              <button onClick={sendWaMsg} className="btn btn-md btn-primary flex-1">
                <WaIcon className="w-4 h-4" />
                WhatsApp-da göndər
              </button>
            </div>
          </div>

          {/* Save as template */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            {!showSaveTemplate ? (
              <button
                onClick={() => planFeatures.templates ? setShowSaveTemplate(true) : undefined}
                disabled={!planFeatures.templates}
                className="btn btn-sm btn-ghost -ml-2"
              >
                <Icon name={planFeatures.templates ? 'save' : 'lock'} className="w-3.5 h-3.5" />
                {planFeatures.templates ? 'Şablon kimi yadda saxla' : 'Şablonlar Growth planındadır'}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={e => setTemplateNameInput(e.target.value)}
                  placeholder="Şablon adı (məs. Antalya 7 gecə)"
                  className="input"
                  autoFocus
                />
                <button onClick={handleSaveTemplate} className="btn btn-md btn-dark">
                  {templateSaved ? 'Saxlandı' : 'Saxla'}
                </button>
                <button onClick={() => { setShowSaveTemplate(false); setTemplateNameInput(''); }} className="btn btn-md btn-ghost">
                  Ləğv
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <Link href="/dashboard" className="btn btn-md btn-secondary flex-1">Təkliflərə qayıt</Link>
            <button onClick={resetForm} className="btn btn-md btn-dark flex-1">
              <Icon name="plus" className="w-4 h-4" strokeWidth={2} />
              Yeni təklif
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main form
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5 pb-28 md:pb-12">
        <PageTitle
          title={isAlt ? 'Alternativ təklif' : 'Yeni təklif'}
          subtitle={isAlt ? 'Daha uyğun büdcəli otel variantları əlavə edin' : 'Müştəri, səfər və otel variantlarını doldurun — link avtomatik hazırlanır'}
          back={{ href: '/dashboard', label: 'Təkliflər' }}
        />

        {/* ── 0. Templates ─────────────────────────────────────────────── */}
        {!planFeatures.templates ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 flex items-center gap-3">
            <Icon name="lock" className="w-4 h-4 text-slate-400" />
            <p className="text-sm text-slate-500">Hazır tur şablonları Growth planından aktivdir.</p>
          </div>
        ) : (
          <div className="card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <p className="section-title">Şablondan başla</p>
              <span className="text-xs text-slate-400">— istiqamət, gecə sayı və xidmətlər dolur</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SEED_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-ink transition-colors"
                >
                  <Icon name="globe" className="w-3.5 h-3.5 text-slate-400" />
                  {t.name}
                </button>
              ))}
              {templates.map(t => (
                <span key={t.id} className="inline-flex items-center h-8 rounded-full border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                  <button type="button" onClick={() => applyTemplate(t)} className="pl-3 pr-1.5 h-full hover:text-ink">
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(t.id)}
                    disabled={deletingTemplId === t.id}
                    aria-label="Şablonu sil"
                    className="pr-2 pl-0.5 h-full text-slate-400 hover:text-red-600"
                  >
                    <Icon name="x" className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Alternative offer notice */}
        {isAlt && duplicateId && (
          planFeatures.alternativeOffer ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-3">
              <Icon name="repeat" className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink">Əvvəlki təklifə alternativ</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Əvvəlki təklif ilə əlaqəli yeni otel variantları əlavə edin.
                  Müştəri məlumatları artıq dolduruldu.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-3">
              <Icon name="lock" className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Alternativ təklif Growth planındadır</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  1-kliklə alternativ təklif yaratma Growth paketindən aktivdir.
                </p>
                {SUPPORT_WA && (
                  <a
                    href={`https://wa.me/${SUPPORT_WA.replace(/\D/g, '')}?text=${encodeURIComponent('Salam! TourFlow Growth paketinə keçmək istəyirəm.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-medium text-brand-700 hover:underline"
                  >
                    Growth planına keç
                  </a>
                )}
              </div>
            </div>
          )
        )}

        {/* ── 1. Agency / Manager ─────────────────────────────────────── */}
        <Section title="Agentlik və menecer" icon="building" description="Müştərinin görəcəyi əlaqə məlumatları">
          {!profileLoaded && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-ink rounded-full animate-spin" />
              Profil yüklənir...
            </p>
          )}
          <Field label="Agentliyin adı">
            <input
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder='Boş buraxsanız "Səyahət Təklifi" görünəcək'
              className={inputCls}
            />
          </Field>
          <Field label="Loqo linki (istəyə görə)">
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
            <Field label="Menecerin WhatsApp nömrəsi" required>
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
        <Section title="Müştəri və səfər" icon="briefcase">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Müştərinin adı" required>
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
            <Field label="İstiqamət" required>
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
                className={`${inputCls} ${startDate && endDate ? 'bg-slate-50 cursor-default text-slate-500' : ''}`}
              />
            </Field>
            <Field label="Təklif etibarlıdır">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <Field label="Müştərinin WhatsApp-ı">
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
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-ink flex items-start gap-1.5">
                <Icon name="info" className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <span>Bu nömrə artıq <strong className="font-medium">{dupClient.name}</strong> kartında var. Təklif bu karta bağlanacaq.</span>
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setClientName(dupClient.name);
                    setSelectedClientId(dupClient.id);
                    setDupClient(null);
                  }}
                  className="btn btn-sm btn-primary"
                >
                  Bu kartı istifadə et
                </button>
                <a
                  href={`/dashboard/clients/${dupClient.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-brand-700 hover:underline self-center"
                >
                  Kartı aç
                </a>
              </div>
            </div>
          )}

          {/* Includes checkboxes */}
          <div>
            <label className="label">Qiymətə daxildir</label>
            <div className="flex flex-wrap gap-2">
              {INCLUDES_META.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleInclude(key)}
                  aria-pressed={includes.includes(key)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm border transition-colors ${
                    includes.includes(key)
                      ? 'bg-ink border-ink text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon name={INCLUDE_ICON[key] ?? 'check'} className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 3. Hotel blocks ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Icon name="bed" className="w-4 h-4 text-slate-400" />
              {isAlt ? 'Büdcəyə uyğun otel variantları' : 'Otel variantları'}
            </h2>
            <span className="text-xs text-slate-500">{hotels.length} / 5</span>
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
              className="w-full h-11 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-white text-slate-600 hover:text-ink text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="plus" className="w-4 h-4" />
              Otel variantı əlavə et
            </button>
          )}
        </div>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {submitErr && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-start gap-2">
            <Icon name="alert" className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {submitErr}
          </div>
        )}

        {/* Inline submit button (always visible in form flow) */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-lg btn-primary w-full hidden md:inline-flex"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Hazırlanır…
            </span>
          ) : (
            isAlt ? 'Alternativ təklifi yarat' : 'Təklif linkini yarat'
          )}
        </button>
      </form>

      {/* Sticky bottom submit bar — hidden when mobile keyboard is open */}
      {!keyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 safe-area-pb md:hidden">
          <button
            form="create-form"
            type="submit"
            disabled={loading}
            onClick={() => { const f = document.querySelector('form'); f?.requestSubmit(); }}
            className="btn btn-lg btn-primary w-full"
          >
            {loading
              ? 'Hazırlanır…'
              : isAlt ? 'Alternativ təklifi yarat' : 'Təklif linkini yarat'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title, icon, description, children,
}: {
  title: string; icon: IconName; description?: string; children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <span className="text-xs text-slate-500 hidden sm:inline">— {description}</span>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-slate-400"> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'input';

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
  const [uploadErr,  setUploadErr]  = useState('');
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
    setUploadErr('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) onChange({ imageUrl: data.url });
      else setUploadErr(data.error ?? 'Şəkil yüklənmədi');
    } catch {
      setUploadErr('Şəkil yüklənmədi. İnternet bağlantısını yoxlayın.');
    }
    setUploading(false);
    e.target.value = '';
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">{index + 1}</span>
          Variant {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="btn btn-sm btn-ghost hover:text-red-600 hover:bg-red-50"
          >
            <Icon name="trash" className="w-3.5 h-3.5" />
            Sil
          </button>
        )}
      </div>

      {/* Name & Stars */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Otelin adı" required>
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
            <option value={3}>3 ulduz</option>
            <option value={4}>4 ulduz</option>
            <option value={5}>5 ulduz</option>
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
        <label className="label">Qidalanma</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(MEAL_LABELS) as MealType[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => onChange({ mealType: k })}
              aria-pressed={hotel.mealType === k}
              title={MEAL_LABELS[k]}
              className={`min-h-[40px] min-w-[52px] px-3 rounded-lg text-sm font-medium border transition-colors ${
                hotel.mealType === k
                  ? 'bg-ink border-ink text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-ink'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {MEAL_LABELS[hotel.mealType as MealType] ?? hotel.mealType}
        </p>
      </div>

      {/* Price, Currency & Price type */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <Field label="Qiymət" required>
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
            className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-center gap-2 ${
              isOld
                ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                : 'border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100'
            }`}
          >
            <Icon name="clock" className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Son təklifdəki qiymət: <strong className="font-medium">{lastPrice.price} {lastPrice.currency}</strong>
            {lastPrice.priceType === 'per_person' ? ' / nəfər' : ' ümumi'}
            {lastPrice.mealType ? ` · ${lastPrice.mealType}` : ''}
            <span className="ml-1 text-slate-400">({daysAgo} gün əvvəl{isOld ? ' — köhnə ola bilər' : ''})</span></span>
            <span className="ml-auto text-[11px] font-medium">Doldur</span>
          </button>
        );
      })()}

      {/* Image section */}
      <div className="space-y-2">
        <label className="label mb-0">Otel şəkli</label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESET_IMAGES.map(preset => (
            <button
              key={preset.url}
              type="button"
              onClick={() => onChange({ imageUrl: preset.url })}
              title={preset.label}
              className={`flex-shrink-0 w-16 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                hotel.imageUrl === preset.url
                  ? 'border-ink ring-2 ring-slate-300'
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
          <label className="btn btn-sm btn-secondary cursor-pointer">
            <Icon name="upload" className="w-3.5 h-3.5" />
            {uploading ? 'Yüklənir…' : 'Şəkil yüklə'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
          <span className="text-xs text-slate-500">və ya yuxarıdan təsviri şəkil seçin · maks. 5 MB</span>
        </div>
        {uploadErr && <p className="text-xs text-red-600">{uploadErr}</p>}
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
              className="w-3.5 h-3.5 rounded accent-brand-600"
            />
            <span className="text-xs text-slate-500">
              Bu şəkli digər agentliklərlə paylaş (kataloqa əlavə et)
            </span>
          </label>
        )}
      </div>

      {/* Note */}
      <Field label="Qısa qeyd">
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
