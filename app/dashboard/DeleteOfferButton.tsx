'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteOfferButton({ offerId }: { offerId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/offers/${offerId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh(); // server component re-renders with fresh data
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? '...' : 'Sil'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
        >
          Ləğv
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-semibold transition-colors"
    >
      🗑 Sil
    </button>
  );
}
