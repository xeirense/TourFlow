'use client';

import { useState } from 'react';

/**
 * Client component that renders a hotel image with automatic fallback.
 * Uses a plain <img> tag to avoid Next.js image-optimization restrictions
 * on Supabase Storage URLs and other external hosts.
 */
export default function HotelImage({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      onError={() => {
        if (imgSrc !== fallback) setImgSrc(fallback);
      }}
      className="w-full h-full object-cover"
    />
  );
}
