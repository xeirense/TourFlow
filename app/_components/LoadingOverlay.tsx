'use client';

/**
 * Full-screen animated loading overlay.
 * Shown after successful login/register while the router navigates to dashboard.
 */
export default function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center gap-6">

      {/* Logo with spinning ring */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-2xl font-black text-white tracking-tighter">TF</span>
        </div>
        {/* Animated teal ring */}
        <div
          className="absolute -inset-2 rounded-[28px] border-2 border-transparent border-t-teal-500 animate-spin"
          style={{ animationDuration: '1s' }}
        />
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-sm">{message}</p>
        <p className="text-slate-500 text-xs">TourFlow</p>
      </div>

      {/* Animated dot pulse */}
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-teal-500"
            style={{
              animation: 'tf-pulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes tf-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
          40%            { opacity: 1;    transform: scale(1.1);  }
        }
      `}</style>
    </div>
  );
}
