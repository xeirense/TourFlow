'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ReminderRow {
  id: string;
  text: string;
  kind: string;
  due_at: string;
  client_id: string;
  clients: { full_name: string; phone: string } | null;
}

interface Props {
  reminders: ReminderRow[];
}

export default function TodayReminders({ reminders }: Props) {
  const [items, setItems] = useState(reminders);

  async function markDone(id: string) {
    await fetch(`/api/reminders/${id}/done`, { method: 'PATCH' });
    setItems(prev => prev.filter(r => r.id !== id));
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600 text-base">🔔</span>
        <p className="text-xs font-black text-amber-700 uppercase tracking-wide">
          Bu gün — {items.length} xatırlatma
        </p>
      </div>
      <ul className="space-y-2">
        {items.map(r => (
          <li key={r.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-900 leading-snug">{r.text}</p>
              {r.clients && (
                <Link
                  href={`/dashboard/clients/${r.client_id}`}
                  className="text-xs text-amber-600 hover:underline"
                >
                  👤 {r.clients.full_name}
                </Link>
              )}
            </div>
            <button
              onClick={() => markDone(r.id)}
              className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:text-green-700 border border-amber-300 hover:border-green-400 rounded-lg px-2.5 py-1 transition-colors"
            >
              ✓ Tamamlandı
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
