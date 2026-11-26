import type { PlanTier } from '@/lib/planConfig';

const PLAN_LABELS: Record<PlanTier, string> = {
  starter:    'Starter',
  growth:     'Growth',
  pro:        'Pro Agency',
  enterprise: 'Enterprise',
};

interface LockedCardProps {
  requiredPlan: PlanTier;
  title:        string;
  /** Optional height class, default h-40 */
  heightCls?:   string;
}

/**
 * Server component overlay shown when a feature is locked for the current plan.
 * Renders a blurred placeholder with upgrade prompt.
 */
export default function LockedCard({
  requiredPlan,
  title,
  heightCls = 'h-40',
}: LockedCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-100 bg-white ${heightCls}`}
    >
      {/* Blurred fake content */}
      <div className="absolute inset-0 p-5 select-none pointer-events-none blur-sm opacity-30">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 bg-slate-100 rounded" style={{ width: `${65 + i * 10}%` }} />
          ))}
        </div>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px]">
        <span className="text-2xl">🔒</span>
        <p className="text-sm font-bold text-gray-700 text-center px-4">{title}</p>
        <p className="text-xs text-gray-500 text-center px-6 leading-relaxed">
          Bu modul{' '}
          <span className="font-semibold text-teal-600">
            {PLAN_LABELS[requiredPlan]}
          </span>{' '}
          və yuxarı planlarda aktivdir
        </p>
      </div>
    </div>
  );
}
