'use client';

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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Sizin seçimləriniz
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* ── Favourites (only shown if multiple hotels) ── */}
        {hotelNames.length > 1 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Bəyəndiyiniz otellər:
            </p>
            <div className="flex flex-wrap gap-2">
              {hotelNames.map(name => {
                const isFav = favorites.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleFav(name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-[.97] ${
                      isFav
                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <span>{isFav ? '♥' : '♡'}</span>
                    <span className="max-w-[120px] truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Note textarea ── */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1.5">
            Menecerə qeyd yazın:
          </p>
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="Məsələn: Uşaqlı ailəyik, hovuz yaxın olsun. İki variant arasında qalmışam..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <button
            onClick={handleSave}
            className={`mt-2 px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[.97] ${
              saved
                ? 'bg-teal-100 text-teal-700 border border-teal-200'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            {saved ? '✓ Qeyd menecerə göndərildi' : 'Qeydi göndər →'}
          </button>
        </div>
      </div>
    </div>
  );
}
