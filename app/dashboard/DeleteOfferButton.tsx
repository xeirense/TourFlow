'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/app/components/Icon';

export default function DeleteOfferButton({ offerId, variant = 'button' }: { offerId: string; variant?: 'button' | 'menu' }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/offers/${offerId}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="text-xs text-slate-500 mr-1">Silinsin?</span>
        <button onClick={handleDelete} disabled={loading} className="btn btn-sm bg-red-600 text-white hover:bg-red-700">
          {loading ? '…' : 'Bəli, sil'}
        </button>
        <button onClick={() => setConfirming(false)} className="btn btn-sm btn-ghost">
          Ləğv
        </button>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
      >
        <Icon name="trash" className="w-4 h-4" />
        Sil
      </button>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn btn-sm btn-danger">
      <Icon name="trash" className="w-3.5 h-3.5" />
      Sil
    </button>
  );
}
