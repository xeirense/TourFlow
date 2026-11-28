'use client';

import Icon from '@/app/components/Icon';
import { useState, useEffect, useCallback } from 'react';

/**
 * CustomerNote
 * Rendered on the customer offer page. Lets the customer:
 *   1. Mark favourite hotels (if multiple options)
 *   2. Leave a short note for the manager
 * Both are stored in localStorage immediately AND synced to Supabase asynchronously.
 */
export default function CustomerNote({
  offerId,
  hotelNames,
}: {
  offerId: string;
  hotelNames: string[];
}) {
  const favKey  = `tf_fav_${offerId}`;
  const noteKey = `tf_note_${offerId}`;

  const [favorites, setFavorites] = useState<string[]>([]);
  const [note,      setNote]      = useState('');
  const [saved,     setSaved]     = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem(favKey) || '[]'));
      setNote(localStorage.getItem(noteKey) || '');
    } catch {}
  }, [favKey, noteKey]);

  function toggleFav(name: string) {
    setFavorites(prev => {
      const next = prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name];
      localStorage.setItem(favKey, JSON.stringify(next));
      // Async sync to Supabase (fire-and-forget)
      syncToServer(next, localStorage.getItem(noteKey) || '');
      return next;
    });
  }

  const syncToServer = useCallback(
    (favs: string[], n: string) => {
      fetch(`/api/offers/${offerId}/customer-data`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ favorites: favs, note: n }),
      }).catch(() => {});
    },
    [offerId],
  );

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setNote(val);
    localStorage.setItem(noteKey, val);
  }

  function handleSave() {
    syncToServer(favorites, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <p className="text-sm font-semibold text-ink">Seçimləriniz və qeydiniz</p>
        <p className="text-xs text-slate-500 mt-0.5">Bəyəndiyiniz otelləri işarələyin, sualınızı yazın</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* ── Favourites (only shown if multiple hotels) ── */}
        {hotelNames.length > 1 && (
          <div>
            <p className="label">Bəyəndiyiniz otellər</p>
            <div className="flex flex-wrap gap-2">
              {hotelNames.map(name => {
                const isFav = favorites.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleFav(name)}
                    aria-pressed={isFav}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                      isFav
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon name="heart" className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                    <span className="max-w-[120px] truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Note textarea ── */}
        <div>
          <p className="label">Menecerə qeyd</p>
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="Məsələn: Uşaqlı ailəyik, hovuz yaxın olsun. İki variant arasında qalmışam..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
          />
          <button
            onClick={handleSave}
            className={`mt-2 btn btn-md ${saved ? 'btn-secondary' : 'btn-dark'}`}
          >
            {saved ? (
              <><Icon name="check" className="w-4 h-4" /> Menecerə göndərildi</>
            ) : (
              <><Icon name="send" className="w-4 h-4" /> Qeydi göndər</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
