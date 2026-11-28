'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/app/components/Icon';

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
  const [items, setItems]         = useState(reminders);
  const [snoozedId, setSnoozedId] = useState<string | null>(null);

  async function markDone(id: string) {
    await fetch(`/api/reminders/${id}/done`, { method: 'PATCH' });
    setItems(prev => prev.filter(r => r.id !== id));
  }

  async function snooze(id: string) {
    setSnoozedId(id);
    try {
      await fetch(`/api/reminders/${id}/snooze`, { method: 'PATCH' });
      setItems(prev => prev.filter(r => r.id !== id));
    } finally {
      setSnoozedId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="card">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <Icon name="bell" className="w-4 h-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-ink">Bu gün</h2>
        <span className="pill pill-brand">{items.length} xatırlatma</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map(r => {
          const phone  = r.clients?.phone?.replace(/\D/g, '');
          const waHref = phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(r.text)}`
            : null;

          return (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-snug">{r.text}</p>
                {r.clients && (
                  <Link
                    href={`/dashboard/clients/${r.client_id}`}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700 mt-0.5"
                  >
                    <Icon name="user" className="w-3 h-3" />
                    {r.clients.full_name}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary" title="WhatsApp-da yaz">
                    <Icon name="message" className="w-3.5 h-3.5" />
                    Yaz
                  </a>
                )}
                <button
                  onClick={() => snooze(r.id)}
                  disabled={snoozedId === r.id}
                  className="btn btn-sm btn-secondary"
                  title="Sabaha sal"
                >
                  <Icon name="clock" className="w-3.5 h-3.5" />
                  Sabah
                </button>
                <button onClick={() => markDone(r.id)} className="btn btn-sm btn-secondary" title="Tamamlandı">
                  <Icon name="check" className="w-3.5 h-3.5" />
                  Hazır
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
