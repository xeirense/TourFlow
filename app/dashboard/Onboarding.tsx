'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon, { type IconName } from '@/app/components/Icon';

export interface OnboardingStep {
  key:   string;
  title: string;
  desc:  string;
  href:  string;
  cta:   string;
  icon:  IconName;
  done:  boolean;
}

/**
 * First-run checklist for a new agency. Disappears once every step is done,
 * or when the owner hides it (remembered in this browser).
 */
export default function Onboarding({ steps, userId }: { steps: OnboardingStep[]; userId: string }) {
  const storageKey = `tf_onboarding_hidden_${userId}`;
  const [hidden, setHidden] = useState(true); // avoid flash before localStorage is read

  useEffect(() => {
    setHidden(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  const doneCount = steps.filter(s => s.done).length;
  if (hidden || doneCount === steps.length) return null;

  return (
    <section className="card">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">TourFlow-a xoş gəlmisiniz</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hesabı tam hazırlamaq üçün {steps.length} addım · {doneCount}/{steps.length} tamamlanıb
          </p>
        </div>
        <button
          onClick={() => { localStorage.setItem(storageKey, '1'); setHidden(true); }}
          className="btn btn-sm btn-ghost px-2"
          aria-label="Gizlət"
          title="Gizlət"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 bg-slate-100">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                s.done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s.done ? <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${s.done ? 'text-slate-400 line-through' : 'text-ink'}`}>{s.title}</p>
              {!s.done && <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>}
            </div>
            {!s.done && (
              <Link href={s.href} className="btn btn-sm btn-secondary flex-shrink-0">
                <Icon name={s.icon} className="w-3.5 h-3.5" />
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
