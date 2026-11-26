export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <div className="bg-[#0A0F1E] h-[60px] w-full" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Period filter skeleton */}
        <div className="flex gap-2">
          {[80, 96, 80, 72].map((w, i) => (
            <div key={i} className={`h-9 w-${w} rounded-xl bg-white border border-slate-200 animate-pulse`}
              style={{ width: w }} />
          ))}
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 text-center">
              <div className="w-10 h-7 rounded-lg bg-slate-100 animate-pulse mx-auto" />
              <div className="w-24 h-3 rounded-lg bg-slate-100 animate-pulse mx-auto" />
              <div className="w-16 h-3 rounded-lg bg-slate-100 animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Response breakdown skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="w-32 h-4 rounded-lg bg-slate-100 animate-pulse" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="w-28 h-3 rounded-lg bg-slate-100 animate-pulse" />
                <div className="w-14 h-3 rounded-lg bg-slate-100 animate-pulse" />
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Destinations skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="w-40 h-4 rounded-lg bg-slate-100 animate-pulse" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="w-32 h-3.5 rounded-lg bg-slate-100 animate-pulse" />
                <div className="w-20 h-3.5 rounded-lg bg-slate-100 animate-pulse" />
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
