'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface HotelHit {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  default_meal: string;
  description_az: string | null;
  photos: string[];
  verified: boolean;
  usage_count: number;
  chain: string | null;
  aliases: string[];
}

interface Props {
  value: string;
  selectedId: string | null;
  onChange: (name: string) => void;
  onSelect: (hotel: HotelHit) => void;
  onClear: () => void;
  inputClassName?: string;
  placeholder?: string;
}

export default function HotelCombobox({
  value,
  selectedId,
  onChange,
  onSelect,
  onClear,
  inputClassName,
  placeholder = 'Regnum Carya...',
}: Props) {
  const [hits, setHits]   = useState<HotelHit[]>([]);
  const [open, setOpen]   = useState(false);
  const timer             = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback((q: string) => {
    clearTimeout(timer.current);
    if (q.length < 2) { setHits([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/hotels/search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setHits(data);
          setOpen(true);
        } else {
          setHits([]);
          setOpen(false);
        }
      } catch { /* ignore */ }
    }, 250);
  }, []);

  useEffect(() => {
    if (!selectedId) search(value);
  }, [value, selectedId, search]);

  function handleSelect(h: HotelHit) {
    setOpen(false);
    setHits([]);
    onSelect(h);
  }

  const starStr = (n: number) => '★'.repeat(Math.min(5, Math.max(1, n)));

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); onClear(); }}
          onFocus={() => { if (hits.length > 0 && !selectedId) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          placeholder={placeholder}
          className={inputClassName}
        />
        {selectedId && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full pointer-events-none">
            Kataloq
          </span>
        )}
      </div>

      {open && hits.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {hits.map(h => (
            <li key={h.id}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(h); }}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-0"
              >
                <span className="text-slate-400 text-xs font-bold flex-shrink-0 mt-0.5 w-14 truncate">
                  {starStr(h.stars)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate leading-tight">{h.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{h.city}, {h.country}</p>
                </div>
                {!h.verified && (
                  <span className="text-[9px] text-slate-600 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded flex-shrink-0">
                    agentlik
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
