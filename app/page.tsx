import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'TourFlow — Peşəkar Tur Təklif Sistemi',
  description:
    'Azərbaycanlı turizm agentlikləri üçün. Müştərilərinizə saniyələr içində gözəl otel təklifləri göndərin.',
};

export default async function LandingPage() {
  // Logged-in users → go straight to dashboard
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans">

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/5 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <span className="font-black text-lg tracking-tight">TourFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Daxil ol
            </Link>
            <Link
              href="/register"
              className="bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Pulsuz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 pt-16 pb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-700/40 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          ✨ 14 gün pulsuz sınaq
        </div>
        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
          Tur Təkliflərinizi<br />
          <span className="text-teal-400">Peşəkarcasına</span> Göndərin
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-8">
          Müştəriləriniz üçün WhatsApp-a göndərə biləcəyiniz
          gözəl otel təkliflərini <strong className="text-white">saniyələr içində</strong> yaradın.
          Excel, PDF, kənar link yoxdur.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold text-base px-7 py-4 rounded-2xl transition-colors shadow-lg shadow-teal-900/40"
          >
            Pulsuz Başla → 14 gün
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base px-7 py-4 rounded-2xl transition-colors"
          >
            Daxil ol
          </Link>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 py-14 border-t border-white/5">
        <h2 className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-10">
          Necə işləyir?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', icon: '🏨', title: 'Otel məlumatlarını daxil edin', desc: 'Müştəriyə təqdim etmək istədiyiniz otelləri, qiymətləri və tarixi əlavə edin.' },
            { step: '02', icon: '🔗', title: 'Unikal link yaradılır',         desc: 'TourFlow gözəl bir müştəri səhifəsi yaradır — heç bir texniki bilik lazım deyil.' },
            { step: '03', icon: '💬', title: 'WhatsApp-a göndərin',           desc: 'Linki WhatsApp-da paylaşın. Müştəri baxdıqda siz dərhal bildiriş alırsınız.' },
          ].map(s => (
            <div key={s.step} className="bg-[#1E293B] rounded-2xl border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-bold text-slate-500">{s.step}</span>
              </div>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 py-14 border-t border-white/5">
        <h2 className="text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-10">
          Niyə TourFlow?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '📊', title: 'Real vaxt analitika',    desc: 'Kim linki açdı, hansı oteli seçdi, nə vaxt baxdı — hamısını görürsünüz.' },
            { icon: '🔔', title: 'Ani bildirişlər',        desc: 'Müştəri linki açanda, WhatsApp-a keçəndə və cavab verəndə email alırsınız.' },
            { icon: '✅', title: 'Müştəri cavabı',         desc: '"Maraqlanıram", "Qiymət yüksəkdir" — müştəri birbaşa cavab verə bilər.' },
            { icon: '🎨', title: 'Premium dizayn',         desc: 'Agentlik loqonuz ilə peşəkar görünüşlü otel kartları. Heç bir kodlama yoxdur.' },
            { icon: '⌛', title: 'Müddət nəzarəti',       desc: 'Hər təklifin bitmə tarixi var — müştərini daha sürətli qərara gətirir.' },
            { icon: '📱', title: 'WhatsApp-first dizayn', desc: 'Hər şey mobil üçün optimallaşdırılıb. Müştəri 1 klik ilə sizinlə əlaqə saxlayır.' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4 bg-[#1E293B] rounded-2xl border border-white/5 p-5">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section className="max-w-sm mx-auto px-5 py-14 border-t border-white/5 text-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">
          Qiymət
        </h2>
        <div className="bg-[#1E293B] border border-teal-500/30 rounded-3xl p-8 shadow-xl shadow-teal-900/20">
          <div className="inline-flex items-center gap-1.5 bg-teal-500/10 text-teal-400 text-xs font-bold px-3 py-1 rounded-full mb-4">
            ✨ 14 gün pulsuz
          </div>
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-5xl font-black text-white">59</span>
            <span className="text-xl font-bold text-teal-400">₼</span>
            <span className="text-slate-500 text-sm">/ay</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">İllik ödənişdə 2 ay pulsuz</p>
          <ul className="text-left space-y-2.5 mb-7">
            {[
              'Limitsiz müştəri təklifi',
              'Real vaxt analitika',
              'Email bildirişlər',
              'Şəkil yükləmə',
              'Agentlik brendinq',
              'WhatsApp inteqrasiyası',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-teal-400 font-bold">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="block w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-sm transition-colors"
          >
            Pulsuz Başla
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-5 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg">✈️</span>
          <span className="font-black text-sm">TourFlow</span>
        </div>
        <p className="text-slate-600 text-xs">
          Azərbaycan turizm agentlikləri üçün hazırlanıb.
        </p>
      </footer>
    </div>
  );
}
