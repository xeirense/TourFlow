import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-white font-bold text-xl">Səhifə tapılmadı</h1>
        <p className="text-slate-400 text-sm">
          Bu tur təklifi mövcud deyil və ya müddəti bitib.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Ana səhifəyə qayıt
        </Link>
      </div>
    </div>
  );
}
