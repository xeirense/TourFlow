import Link from 'next/link';
import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PLANS, type PlanTier } from '@/lib/planConfig';
import Icon, { type IconName } from '@/app/components/Icon';

export const metadata = {
  title: 'TourFlow — Tur agentlikləri üçün təklif və satış platforması',
  description:
    'Müştəriyə dəqiqələr ərzində brendlənmiş tur təklifi göndərin, linkin açıldığını anında görün, cavabı bir kliklə alın. Azərbaycan tur agentlikləri üçün.',
};

const WA_SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_WA ?? '';

const STEPS: { n: string; icon: IconName; title: string; desc: string }[] = [
  {
    n: '01',
    icon: 'bed',
    title: 'Otelləri əlavə edin',
    desc: 'Kataloqdan oteli seçin — ulduz, şəhər və qidalanma özü dolur. Qiyməti yazın, 5-ə qədər variant əlavə edin.',
  },
  {
    n: '02',
    icon: 'link',
    title: 'Linki göndərin',
    desc: 'Agentliyinizin loqosu və müştərinin adı ilə səliqəli təklif səhifəsi hazırlanır. Linki WhatsApp-la göndərin.',
  },
  {
    n: '03',
    icon: 'bell',
    title: 'Reaksiyanı görün',
    desc: 'Müştəri linki açanda, cavab verəndə və ya otel seçəndə bildiriş alırsınız. Doğru anda zəng edirsiniz.',
  },
];

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'eye',      title: 'Baxış izləmə',         desc: 'Müştərinin təklifi nə vaxt və neçə dəfə açdığını görün.' },
  { icon: 'message',  title: 'Bir kliklə cavab',     desc: '“Maraqlanıram”, “Qiymət yüksəkdir” — müştəri zəng etmədən fikrini bildirir.' },
  { icon: 'building', title: 'Agentliyinizin brendi', desc: 'Hər təklifdə loqonuz, adınız və menecerin əlaqə məlumatları.' },
  { icon: 'user',     title: 'Müştəri bazası',       desc: 'Hər müştərinin tarixçəsi, üstünlükləri və təklifləri bir kartda.' },
  { icon: 'clock',    title: 'Avtomatik xatırlatma', desc: 'Cavab gəlməyəndə, təklifin müddəti bitəndə — sistem xatırladır.' },
  { icon: 'chart',    title: 'Satış analitikası',    desc: 'Satış hunisi, populyar istiqamətlər və dönüşüm nisbəti.' },
];

export default async function LandingPage() {
  const { user } = await getAuth();
  if (user) redirect('/dashboard');

  const enterpriseWa = WA_SUPPORT
    ? `https://wa.me/${WA_SUPPORT.replace(/\D/g, '')}?text=${encodeURIComponent('Salam! TourFlow Enterprise paketi haqqında məlumat almaq istəyirəm.')}`
    : '/register';

  return (
    <div className="min-h-screen bg-white text-ink">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center text-[11px] font-bold text-white tracking-wide">TF</span>
            <span className="font-semibold tracking-tight">TourFlow</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#imkanlar" className="hidden md:inline-flex btn btn-md btn-ghost">İmkanlar</a>
            <a href="#qiymetler" className="hidden sm:inline-flex btn btn-md btn-ghost">Qiymətlər</a>
            <Link href="/login" className="btn btn-md btn-ghost">Daxil ol</Link>
            <Link href="/register" className="btn btn-md btn-dark">Pulsuz başla</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#F8FAFC,#FFFFFF)]" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-16 sm:pt-28 sm:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 border border-slate-200 bg-white rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
              Azərbaycan tur agentlikləri üçün
            </p>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[56px] font-semibold tracking-tight leading-[1.08]">
              Tur təklifini göndərin.<br />
              <span className="text-slate-400">Müştərinin reaksiyasını görün.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
              TourFlow ilə hər müştəriyə dəqiqələr ərzində agentliyinizin brendi ilə peşəkar təklif hazırlayın.
              Müştəri linki açan, cavab verən və ya otel seçən kimi bilirsiniz.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="btn btn-lg btn-primary">
                14 gün pulsuz sınayın
                <Icon name="chevron" className="w-4 h-4" strokeWidth={2} />
              </Link>
              <a href="#qiymetler" className="btn btn-lg btn-secondary">Qiymətlərə bax</a>
            </div>
            <p className="mt-4 text-xs text-slate-500">14 gün pulsuz · İllik öhdəlik yoxdur · İstənilən vaxt dayandırın</p>
          </div>

          {/* Product preview */}
          <div className="relative">
            <div className="card p-5 shadow-[0_24px_60px_-20px_rgba(11,15,23,0.25)]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-ink text-white text-xs font-semibold flex items-center justify-center">S</span>
                  <div>
                    <p className="text-sm font-medium">Sunrise Travel</p>
                    <p className="text-xs text-slate-500">Fərdi tur təklifi</p>
                  </div>
                </div>
                <span className="pill pill-brand">
                  <Icon name="eye" className="w-3 h-3" />
                  3 baxış
                </span>
              </div>
              <div className="pt-4 space-y-3">
                {[
                  { name: 'Sahil Resort & Spa', meta: '5 ulduz · Ultra hər şey daxil', price: '1 450' },
                  { name: 'Mavi Laguna Hotel',  meta: '5 ulduz · Hər şey daxil',       price: '1 180' },
                ].map((h, i) => (
                  <div key={h.name} className={`rounded-lg border p-3.5 flex items-center justify-between ${i === 0 ? 'border-ink' : 'border-slate-200'}`}>
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{h.meta}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{h.price} ₼</p>
                      <p className="text-[11px] text-slate-500">nəfər başına</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <Icon name="check" className="w-4 h-4 text-brand-600" strokeWidth={2.25} />
                  <p className="text-xs text-slate-700"><span className="font-medium text-ink">Aysel xanım</span> Sahil Resort & Spa otelini seçdi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <p className="section-title">Necə işləyir</p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight max-w-xl">
            Üç addım — Excel, skrinşot və uzun mesajlar olmadan
          </h2>
          <div className="mt-12 grid sm:grid-cols-3 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {STEPS.map(s => (
              <div key={s.n} className="bg-white p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-lg bg-slate-100 text-ink flex items-center justify-center">
                    <Icon name={s.icon} className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-medium text-slate-400 tabular-nums">{s.n}</span>
                </div>
                <h3 className="mt-5 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="imkanlar" className="py-20 sm:py-24 px-5 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <p className="section-title">İmkanlar</p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight max-w-xl">
            Satışı itirməmək üçün lazım olan hər şey
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6">
                <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <Icon name={f.icon} className="w-[18px] h-[18px]" />
                </span>
                <h3 className="mt-4 font-semibold text-[15px]">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="qiymetler" className="py-20 sm:py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl">
            <p className="section-title">Qiymətlər</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Agentliyinizin ölçüsünə uyğun plan
            </h2>
            <p className="mt-3 text-slate-600">
              Aylıq ödəniş, illik öhdəlik yoxdur. Hər plan 14 günlük pulsuz sınaqla başlayır.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
            {(Object.keys(PLANS) as PlanTier[]).map(tier => {
              const plan          = PLANS[tier];
              const isEnterprise  = tier === 'enterprise';
              const isHighlighted = plan.highlighted;

              return (
                <div
                  key={tier}
                  className={`relative rounded-xl border p-6 flex flex-col bg-white ${
                    isHighlighted ? 'border-ink ring-1 ring-ink' : 'border-slate-200'
                  }`}
                >
                  {isHighlighted && (
                    <span className="absolute -top-3 left-6 pill pill-strong">Ən çox seçilən</span>
                  )}

                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed min-h-[32px]">{plan.tagline}</p>

                  <div className="mt-5">
                    {isEnterprise ? (
                      <p className="text-3xl font-semibold tracking-tight">Fərdi</p>
                    ) : (
                      <p className="flex items-baseline gap-1">
                        <span className="text-3xl font-semibold tracking-tight">{plan.price} ₼</span>
                        <span className="text-slate-500 text-sm">/ ay</span>
                      </p>
                    )}
                  </div>

                  {isEnterprise ? (
                    <a href={enterpriseWa} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-secondary w-full mt-5">
                      Bizimlə əlaqə
                    </a>
                  ) : (
                    <Link
                      href={`/register?plan=${tier}`}
                      className={`btn btn-md w-full mt-5 ${isHighlighted ? 'btn-primary' : 'btn-dark'}`}
                    >
                      Pulsuz sınağa başla
                    </Link>
                  )}

                  <ul className="mt-6 pt-6 border-t border-slate-100 space-y-2.5 flex-1">
                    {plan.highlights.map(h => (
                      <li key={h} className="flex items-start gap-2">
                        <Icon name="check" className="w-4 h-4 mt-px flex-shrink-0 text-ink" strokeWidth={2} />
                        <span className="text-slate-600 text-[13px] leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-5 pb-20 sm:pb-24">
        <div className="max-w-6xl mx-auto rounded-2xl bg-ink text-white px-6 py-14 sm:px-14 sm:py-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Müştəri cavab gözləmir. Siz də gözləməyin.
            </h2>
            <p className="mt-3 text-slate-400 leading-relaxed">
              İlk təklifinizi bu gün göndərin və müştərinin reaksiyasını real vaxtda görün.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link href="/register" className="btn btn-lg btn-primary">14 gün pulsuz sınayın</Link>
            <Link href="/login" className="btn btn-lg border border-white/20 text-white hover:bg-white/10">Daxil ol</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 px-5 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 bg-ink rounded-md flex items-center justify-center text-[9px] font-bold text-white">TF</span>
            <span className="text-sm font-medium">TourFlow</span>
            <span className="text-xs text-slate-400 ml-2">Azərbaycan tur agentlikləri üçün</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#qiymetler" className="hover:text-ink transition-colors">Qiymətlər</a>
            <Link href="/privacy" className="hover:text-ink transition-colors">Məxfilik</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Şərtlər</Link>
            <Link href="/login" className="hover:text-ink transition-colors">Daxil ol</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
