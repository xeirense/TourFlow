'use client';

import { useEffect, useRef } from 'react';

export default function OfferViewTracker({ offerId }: { offerId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Fire-and-forget: increment views_count
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId, type: 'view' }),
    }).catch(() => {}); // silently ignore errors
  }, [offerId]);

  return null;
}
