'use client';

import { useState, useEffect } from 'react';

const RESPONSES = [
  {
    value: 'interested',
    label: '✅ Maraqlanıram',
    cls:   'bg-teal-600 hover:bg-teal-700 text-white border-teal-600',
  },
  {
    value: 'price_high',
    label: '💬 Qiymət yüksəkdir',
    cls:   'bg-white hover:bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    value: 'not_interested',
    label: '❌ Maraqlanmıram',
    cls:   'bg-white hover:bg-gray-50 text-gray-500 border-gray-200',
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
      <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-5 text-center space-y-1">
        <p className="text-teal-700 font-bold text-base">Cavabınız qeydə alındı ✓</p>
        <p className="text-gray-400 text-xs">Menecer sizinlə tezliklə əlaqə saxlayacaq</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        Bu təklif sizi maraqlandırdı?
      </p>
      <div className="flex flex-col gap-2">
        {RESPONSES.map(r => (
          <button
            key={r.value}
            onClick={() => handleResponse(r.value)}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed border ${r.cls}`}
          >
            {loading && selected === r.value ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Göndərilir...
              </span>
            ) : (
              r.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
