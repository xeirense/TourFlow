'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/app/components/Icon';
import DeleteOfferButton from './DeleteOfferButton';

export default function OfferMenu({
  offerId,
  previewUrl,
  showAlternative,
}: {
  offerId: string;
  previewUrl: string;
  showAlternative: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Digər əməliyyatlar"
        aria-expanded={open}
        className="btn btn-sm btn-secondary w-8 px-0"
      >
        <Icon name="more" className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-52 bg-white border border-slate-200 rounded-lg shadow-lg p-1">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
            <Icon name="eye" className="w-4 h-4 text-slate-400" />
            Müştəri kimi bax
          </a>
          <Link href={`/create?from=${offerId}`} className={item}>
            <Icon name="copy" className="w-4 h-4 text-slate-400" />
            Dublikat yarat
          </Link>
          {showAlternative && (
            <Link href={`/create?from=${offerId}&alt=1`} className={item}>
              <Icon name="repeat" className="w-4 h-4 text-slate-400" />
              Ucuz alternativ
            </Link>
          )}
          <div className="h-px bg-slate-100 my-1" />
          <DeleteOfferButton offerId={offerId} variant="menu" />
        </div>
      )}
    </div>
  );
}
