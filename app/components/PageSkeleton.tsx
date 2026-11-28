// Neutral loading placeholder shown inside the app shell while a page loads.
export default function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-pulse" aria-busy="true" aria-label="Yüklənir">
      <div className="h-7 w-48 bg-slate-200 rounded-md" />
      <div className="h-4 w-72 bg-slate-200/70 rounded-md mt-2.5" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card h-[88px]" />
        ))}
      </div>
      <div className="card mt-6 divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-5 py-5 flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
