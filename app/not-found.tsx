import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-xs w-full">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Səhifə tapılmadı</h1>
        <p className="text-sm text-slate-500 mb-6">
          Bu tur təklifi mövcud deyil və ya müddəti bitib.
        </p>
        <Link
          href="/create"
          className="inline-block px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl transition-colors"
        >
          Ana səhifəyə qayıt
        </Link>
      </div>
    </div>
  );
}
