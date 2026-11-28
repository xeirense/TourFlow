'use client';

/**
 * Full-screen loading state.
 * Shown after successful login/register while the router navigates to the dashboard.
 */
export default function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-ink flex items-center justify-center">
          <span className="text-sm font-bold text-white tracking-wide">TF</span>
        </div>
        <div className="absolute -inset-2 rounded-2xl border-2 border-transparent border-t-brand-600 animate-spin" style={{ animationDuration: '0.9s' }} />
      </div>
      <div className="text-center">
        <p className="text-ink font-medium text-sm">{message}</p>
        <p className="text-slate-500 text-xs mt-1">TourFlow</p>
      </div>
    </div>
  );
}
