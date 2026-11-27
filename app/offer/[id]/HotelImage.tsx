'use client';

import { useState } from 'react';

// Distinct gradient backgrounds per hotel slot
const GRADIENTS = [
  'from-blue-900 via-blue-800 to-teal-700',
  'from-purple-900 via-indigo-800 to-blue-700',
  'from-amber-800 via-orange-700 to-yellow-600',
  'from-green-900 via-emerald-800 to-teal-700',
  'from-rose-900 via-pink-800 to-red-700',
];

/**
 * Renders a hotel image. If no src is provided or the image fails to load,
 * shows a branded gradient placeholder with hotel name and stars instead of
 * a misleading Unsplash stock photo.
 */
export default function HotelImage({
  src,
  alt,
  stars,
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
        <span className="text-5xl opacity-80">🏨</span>
        <p className="text-white font-bold text-lg text-center leading-snug line-clamp-2 drop-shadow">
          {alt}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: stars }).map((_, i) => (
            <svg key={i} viewBox="0 0 20 20" fill="#fbbf24" className="w-4 h-4">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
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
