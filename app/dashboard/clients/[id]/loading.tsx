export default function LoadingClientProfile() {
  return (
    <div className="min-h-screen bg-slate-100 animate-pulse">
      <div className="bg-[#0A0F1E] h-16" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-28 bg-white rounded-2xl" />
        <div className="h-48 bg-white rounded-2xl" />
        <div className="h-64 bg-white rounded-2xl" />
      </div>
    </div>
  );
}
