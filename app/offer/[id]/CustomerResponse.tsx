'use client';

import { useState, useEffect } from 'react';
import Icon from '@/app/components/Icon';

const RESPONSES = [
  {
    value: 'interested',
    label: 'Maraqlanıram',
    icon:  'check',
    cls:   'bg-ink hover:bg-ink-soft text-white border-ink',
  },
  {
    value: 'price_high',
    label: 'Qiymət yüksəkdir',
    icon:  'tag',
    cls:   'bg-white hover:bg-slate-50 text-ink border-slate-200',
  },
  {
    value: 'not_interested',
    label: 'Maraqlanmıram',
    icon:  'x',
    cls:   'bg-white hover:bg-slate-50 text-slate-500 border-slate-200',
  },
] as const;

type ResponseValue = typeof RESPONSES[number]['value'];

export default function CustomerResponse({ offerId }: { offerId: string }) {
  const storageKey = `tf_response_${offerId}`;
  const [selected, setSelected] = useState<ResponseValue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
      setDone(true);
    }
  }, [storageKey]);

  async function handleResponse(value: ResponseValue) {
    setSelected(value);
    setLoading(true);
    try {
      await fetch(`/api/offers/${offerId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: value }),
      });
      localStorage.setItem(storageKey, value);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
          <Icon name="check" className="w-4 h-4" strokeWidth={2.25} />
        </span>
        <div>
          <p className="text-ink font-medium text-sm">Cavabınız menecerə çatdı</p>
          <p className="text-slate-500 text-xs mt-0.5">Tezliklə sizinlə əlaqə saxlanılacaq</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {RESPONSES.map(r => (
          <button
            key={r.value}
            onClick={() => handleResponse(r.value)}
            disabled={loading}
            className={`w-full h-11 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border inline-flex items-center justify-center gap-2 ${r.cls}`}
          >
            {loading && selected === r.value ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Göndərilir…
              </span>
            ) : (
              <>
                <Icon name={r.icon} className="w-4 h-4" />
                {r.label}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
