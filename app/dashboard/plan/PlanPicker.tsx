'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';
import { PLANS, type PlanTier } from '@/lib/planConfig';

const ORDER: PlanTier[] = ['starter', 'growth', 'pro', 'enterprise'];

export default function PlanPicker({
  current,
  trialing,
  trialDaysLeft,
  canChange,
  supportWa,
}: {
  current:       PlanTier;
  trialing:      boolean;
  trialDaysLeft: number;
  canChange:     boolean;     // owner (not an invited manager)
  supportWa:     string;
}) {
  const router = useRouter();
  const [busy,  setBusy]  = useState<PlanTier | null>(null);
  const [error, setError] = useState('');
  const [done,  setDone]  = useState<PlanTier | null>(null);

  const waLink = (text: string) =>
    supportWa ? `https://wa.me/${supportWa.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : '';

  async function choose(tier: PlanTier) {
    setBusy(tier);
    setError('');
    setDone(null);
    try {
      const res  = await fetch('/api/plan/change', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Plan dəyişdirilmədi');
        return;
      }
      setDone(tier);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <Icon name="alert" className="w-4 h-4" />
          {error}
        </p>
      )}
      {done && (
        <p className="text-sm text-brand-700 flex items-center gap-1.5">
          <Icon name="check" className="w-4 h-4" />
          {PLANS[done].name} planı aktivləşdirildi
        </p>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {ORDER.map(tier => {
          const plan       = PLANS[tier];
          const isCurrent  = tier === current;
          const enterprise = tier === 'enterprise';

          let action: React.ReactNode;
          if (isCurrent) {
            action = <span className="btn btn-md btn-secondary w-full pointer-events-none">Cari plan</span>;
          } else if (!canChange) {
            action = <span className="btn btn-md btn-secondary w-full opacity-60 cursor-not-allowed" title="Planı yalnız rəhbər dəyişə bilər">Rəhbər dəyişə bilər</span>;
          } else if (enterprise || !trialing) {
            const href = waLink(`Salam! TourFlow-da ${plan.name} planına keçmək istəyirəm.`);
            action = href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-md btn-dark w-full">
                Bizimlə əlaqə
              </a>
            ) : (
              <span className="btn btn-md btn-secondary w-full pointer-events-none">Dəstək ilə əlaqə</span>
            );
          } else {
            action = (
              <button onClick={() => choose(tier)} disabled={busy !== null} className="btn btn-md btn-primary w-full">
                {busy === tier ? 'Keçid edilir…' : `${plan.name} planına keç`}
              </button>
            );
          }

          return (
            <div
              key={tier}
              className={`rounded-xl border p-5 flex flex-col bg-white ${isCurrent ? 'border-ink ring-1 ring-ink' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {isCurrent && <span className="pill pill-strong">Cari</span>}
              </div>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed min-h-[32px]">{plan.tagline}</p>
              <p className="mt-4 flex items-baseline gap-1">
                {plan.price === null ? (
                  <span className="text-2xl font-semibold tracking-tight">Fərdi</span>
                ) : (
                  <>
                    <span className="text-2xl font-semibold tracking-tight">{plan.price} ₼</span>
                    <span className="text-slate-500 text-sm">/ ay</span>
                  </>
                )}
              </p>
              <div className="mt-4">{action}</div>
              <ul className="mt-5 pt-5 border-t border-slate-100 space-y-2 flex-1">
                {plan.highlights.map(h => (
                  <li key={h} className="flex items-start gap-2">
                    <Icon name="check" className="w-4 h-4 mt-px flex-shrink-0 text-ink" strokeWidth={2} />
                    <span className="text-slate-600 text-[13px] leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        {trialing
          ? `Pulsuz sınaq müddətində (${trialDaysLeft} gün qalıb) istənilən planı sınaya bilərsiniz. Sınaq bitdikdə seçdiyiniz planın aylıq ödənişi ilə davam edirsiniz.`
          : 'Plan dəyişikliyi və ödəniş üçün bizimlə əlaqə saxlayın.'}
      </p>
    </div>
  );
}
