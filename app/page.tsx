import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'TourFlow — Azərbaycanda Tur Agentliyi üçün Rəqəmsal Platforma',
  description:
    'Hər müştəriyə 30 saniyədə brendlənmiş, peşəkar tur təklifi göndərin. Real vaxt analitika. WhatsApp inteqrasiyası. Müştəri rəyləri.',
};

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ════════════════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════════════════ */}
      <nav className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0A0F1E] rounded-lg flex items-center justify-center">
              <span className="text-xs font-black text-white tracking-tighter">TF</span>
            </div>
            <span className="font-black text-lg tracking-tight text-gray-900">TourFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Daxil ol
            </Link>
            <Link
              href="/register"
              className="bg-[#0A0F1E] hover:bg-gray-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Pulsuz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A0F1E] text-white">
        <div className="max-w-5xl mx-auto px-5 pt-20 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            Azərbaycanın Tur Agentlikləri Üçün
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-6 tracking-tight">
            Müştərini Heyrətləndir.<br />
            <span className="text-teal-400">Rəqibi Arxada Qoy.</span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            TourFlow ilə hər müştəriyə{' '}
            <span className="text-white font-semibold">30 saniyədə</span>{' '}
            fərdi, brendlənmiş tur presentasiyası göndər.
            Müştərin linki açan kimi sən bilirsən. Rəqibin hələ Excel-dədir.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold text-base px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-teal-900/40"
            >
              Pulsuz Başla →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-colors"
            >
              Daxil ol
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="border-t border-white/5 bg-white/3">
          <div className="max-w-5xl mx-auto px-5 py-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-black text-white">30s</p>
              <p className="text-gray-500 text-sm mt-1">Hər yeni təklif üçün</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">5</p>
              <p className="text-gray-500 text-sm mt-1">Otel 1 linklə</p>
            </div>
            <div>
              <p className="text-3xl font-black text-white">Ani</p>
              <p className="text-gray-500 text-sm mt-1">Müştəri bildirişi</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-12">
            Necə işləyir?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '🏨',
                title: 'Otelləri daxil et',
                desc: 'Müştəri üçün hazırladığın otel variantlarını, qiymətləri, tarixi və şəkilləri əlavə et. 30 saniyə.',
              },
              {
                step: '02',
                icon: '🔗',
                title: 'Brendlənmiş link hazırlanır',
                desc: 'TourFlow agentlik loqonla, müştərinin adıyla peşəkar bir prezentasiya səhifəsi yaradır.',
              },
              {
                step: '03',
                icon: '💬',
                title: 'Müştəri baxanda sən bilirsən',
                desc: 'Link açılır, sən email alırsan. Müştəri WhatsApp-a keçir, sən ilk bilənsən. İndi zəng et.',
              },
            ].map(s => (
              <div key={s.step} className="relative">
                <div className="text-xs font-black text-gray-200 mb-4 tracking-widest">{s.step}</div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FEATURES — "Niyə TourFlow?"
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-20 px-5 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Niyə TourFlow?
          </p>
          <h2 className="text-center text-2xl sm:text-3xl font-black text-gray-900 mb-12">
            Excel dövründə qalmaq lazım deyil
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '🔔',
                title: 'Müştəri Görməzdən Sən Bilirsən',
                desc: 'Müştəri linki açan kimi email alırsan. WhatsApp-a keçəndə — ani bildiriş. Soyuq tərəfdaşı isti müştəriyə çevirirsən.',
              },
              {
                icon: '💬',
                title: 'Müştəri Birbaşa Cavab Verir',
                desc: '"Maraqlanıram", "Qiymət yüksəkdir" — müştəri bir klikdə cavab verir. Artıq zəng gözləmirsən.',
              },
              {
                icon: '🏷️',
                title: 'Hər Səhifədə Sənin Brendin',
                desc: 'Agentliyin loqosu, adı, menecerin adı — müştəri hər dəfə sənin brendinlə tanış olur. Professionallıq görünür.',
              },
              {
                icon: '📊',
                title: 'Real Vaxt Analitika',
                desc: 'Kim nəyə baxdı, hansı istiqamət daha çox maraqlandırdı, dönüşüm nisbəti nədir — hamısı bir yerdə.',
              },
              {
                icon: '⌛',
                title: 'Vaxt Təzyiqi Avtomatik İşləyir',
                desc: 'Hər təklifin bitmə tarixi var. Müştəri görür ki, vaxt azalır. Bu, qərara gəlməyi sürətləndirir.',
              },
              {
                icon: '📱',
                title: 'WhatsApp-First — Çünki Azərbaycanda İş Belə Aparılır',
                desc: 'Hər otel kartında birbaşa WhatsApp düyməsi var. Müştəri 1 klikdə sənə müraciət edir.',
              },
            ].map(f => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA SECTION
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A0F1E] text-white py-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-5 leading-tight">
            Rəqibindən əvvəl başla.<br />
            <span className="text-teal-400">Müştərini qazan.</span>
          </h2>
          <p className="text-gray-400 text-base mb-8 leading-relaxed">
            Hər gün tur agentlikləri müştərilərini vaxtında cavab verə bilmədikləri üçün itirir.
            TourFlow ilə sən həmişə birinci bilənsən.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold text-base px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-teal-900/40"
          >
            İndi Pulsuz Başla →
          </Link>
          <p className="text-gray-600 text-xs mt-4">Kredit kartı tələb olunmur</p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#060B14] border-t border-white/5 px-5 py-10 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
            <span className="text-xs font-black text-white leading-none">TF</span>
          </div>
          <span className="font-black text-sm text-white">TourFlow</span>
        </div>
        <p className="text-gray-600 text-xs">
          Azərbaycan turizm agentlikləri üçün hazırlanıb.
        </p>
        <div className="flex items-center justify-center gap-6 mt-5">
          <Link href="/login"    className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Daxil ol</Link>
          <Link href="/register" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Qeydiyyat</Link>
        </div>
      </footer>
    </div>
  );
}
