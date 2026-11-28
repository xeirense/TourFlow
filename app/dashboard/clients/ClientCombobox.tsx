'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ClientHit {
  id: string;
  full_name: string;
  phone: string;
  travelers: { adults: number; children: number; child_ages: number[] };
  preferred_destinations: string[];
}

interface Props {
  value: string;
  selectedId: string | null;
  onChange: (name: string) => void;
  onSelect: (client: ClientHit) => void;
  onClear: () => void;
  inputClassName?: string;
}

export default function ClientCombobox({
  value, selectedId, onChange, onSelect, onClear, inputClassName,
}: Props) {
  const [results, setResults] = useState<ClientHit[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim() || q.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/clients?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        if (Array.isArray(data)) { setResults(data); setOpen(data.length > 0); }
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 280);
  }, []);

  useEffect(() => {
    if (!selectedId) search(value);
    else { setResults([]); setOpen(false); }
  }, [value, selectedId, search]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          required
          value={value}
          onChange={e => { onChange(e.target.value); }}
          onFocus={() => { if (results.length > 0 && !selectedId) setOpen(true); }}
          placeholder="Aysel xanım"
          className={inputClassName}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-block w-3.5 h-3.5 border-2 border-slate-300 border-t-ink rounded-full animate-spin" />
        )}
        {selectedId && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink text-sm"
            title="Seçimi təmizlə"
          >
            ✕
          </button>
        )}
      </div>

      {selectedId && (
        <p className="text-xs text-brand-700 mt-1.5">Mövcud müştəri seçildi — məlumatlar dolduruldu</p>
      )}

      {open && !selectedId && results.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {results.map(c => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                onMouseDown={e => {
                  e.preventDefault();
                  onSelect(c);
                  setOpen(false);
                }}
              >
                <p className="text-sm text-ink font-medium">{c.full_name}</p>
                {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
                {c.preferred_destinations.length > 0 && (
                  <p className="text-xs text-slate-500">{c.preferred_destinations.slice(0, 2).join(', ')}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
