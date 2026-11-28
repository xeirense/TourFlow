import Link from 'next/link';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';
const SUPPORT_WA    = process.env.NEXT_PUBLIC_SUPPORT_WA ?? '';

/** Shared layout for /privacy and /terms. */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <nav className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center text-[11px] font-bold text-white tracking-wide">TF</span>
            <span className="font-semibold tracking-tight">TourFlow</span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/privacy" className="btn btn-md btn-ghost">Məxfilik</Link>
            <Link href="/terms" className="btn btn-md btn-ghost">Şərtlər</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 mt-2">Son yenilənmə: {updated}</p>
        <div className="legal mt-10 space-y-8 text-[15px] leading-relaxed text-slate-700">
          {children}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-600">
          <p className="font-medium text-ink">Əlaqə</p>
          <p className="mt-1">
            Bu sənədlə bağlı suallarınız üçün bizimlə əlaqə saxlayın
            {CONTACT_EMAIL && <>: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-700 hover:underline">{CONTACT_EMAIL}</a></>}
            {SUPPORT_WA && <>{CONTACT_EMAIL ? ' və ya ' : ': '}<a href={`https://wa.me/${SUPPORT_WA.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">WhatsApp</a></>}
            .
          </p>
        </div>
      </main>
    </div>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink tracking-tight">{n}. {title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 pl-5 list-disc marker:text-slate-300">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}
