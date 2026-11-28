'use client';

import { useState } from 'react';
import Icon from '@/app/components/Icon';

// Calm, neutral placeholders (ink → slate) — no stock photos, no loud colours
const GRADIENTS = [
  'from-ink via-ink-soft to-slate-700',
  'from-slate-800 via-slate-700 to-slate-600',
  'from-brand-950 via-ink-soft to-slate-700',
];

/**
 * Renders a hotel image. If no src is provided or the image fails to load,
 * shows a branded gradient placeholder with the hotel name instead of
 * a misleading Unsplash stock photo.
 */
export default function HotelImage({
  src,
  alt,
  stars: _stars,
  index,
}: {
  src:   string;
  alt:   string;
  stars: number;
  index: number;
}) {
  const [error, setError] = useState(!src);
  const gradient = GRADIENTS[index % GRADIENTS.length];

  if (error) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-3 px-4`}>
        <Icon name="bed" className="w-9 h-9 text-white/50" strokeWidth={1.5} />
        <p className="text-white font-semibold text-lg text-center leading-snug line-clamp-2">
          {alt}
        </p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-full object-cover"
    />
  );
}
