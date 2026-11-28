import Link from 'next/link';
import Icon from '@/app/components/Icon';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <Icon name="search" className="w-6 h-6" />
        </div>
        <h1 className="text-ink font-semibold text-lg mt-5">Səhifə tapılmadı</h1>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Bu səhifə və ya tur təklifi mövcud deyil. Linki göndərən agentliklə əlaqə saxlayın.
        </p>
        <Link href="/" className="btn btn-md btn-dark mt-6">
          Ana səhifə
        </Link>
      </div>
    </div>
  );
}
