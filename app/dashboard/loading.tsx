// Shown automatically by Next.js App Router while DashboardPage streams in
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header skeleton */}
      <div className="bg-[#0A0F1E] h-[60px] w-full" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-4 h-24 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
              <div className="w-12 h-5 rounded-lg bg-slate-100 animate-pulse" />
              <div className="w-20 h-3 rounded-lg bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Analytics banner skeleton */}
        <div className="bg-[#0A0F1E]/80 rounded-2xl h-16 animate-pulse" />

        {/* Offers list skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="w-40 h-4 rounded-lg bg-slate-100 animate-pulse" />
            <div className="w-16 h-3 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="px-5 py-4 border-b border-slate-50 flex items-start gap-4"
            >
              <div className="flex-1 space-y-2.5">
                <div className="flex gap-3">
                  <div className="w-28 h-4 rounded-lg bg-slate-100 animate-pulse" />
                  <div className="w-20 h-4 rounded-lg bg-slate-100 animate-pulse" />
                </div>
                <div className="w-48 h-3 rounded-lg bg-slate-100 animate-pulse" />
                <div className="w-24 h-5 rounded-full bg-slate-100 animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-7 rounded-lg bg-slate-100 animate-pulse" />
                <div className="w-14 h-7 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
