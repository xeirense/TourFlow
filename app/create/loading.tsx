export default function CreateLoading() {
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <div className="bg-[#0A0F1E] h-[60px] w-full" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

        {/* Agency section skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
          <div className="w-48 h-4 rounded-lg bg-slate-100 animate-pulse" />
          {[1, 2].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="w-32 h-3 rounded-lg bg-slate-100 animate-pulse" />
              <div className="w-full h-10 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Trip section skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
          <div className="w-40 h-4 rounded-lg bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="w-24 h-3 rounded-lg bg-slate-100 animate-pulse" />
                <div className="w-full h-10 rounded-xl bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Hotel block skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="w-32 h-4 rounded-lg bg-slate-100 animate-pulse" />
          <div className="w-full h-10 rounded-xl bg-slate-100 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="w-full h-28 rounded-xl bg-slate-100 animate-pulse" />
        </div>

        {/* Submit button skeleton */}
        <div className="w-full h-14 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}
