export default function LoadingClients() {
  return (
    <div className="min-h-screen bg-slate-100 animate-pulse">
      <div className="bg-[#0A0F1E] h-16" />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="h-10 bg-slate-200 rounded-xl" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
