'use client';

import { useState } from 'react';
import Icon from '@/app/components/Icon';

interface Props {
  clientName:  string;
  destination: string;
  dateRange:   string;
  nights:      number;
  hotelsCount: number;
  offerLink:   string;
  clientPhone?: string; // client's WA number (preferred target)
  waNumber:    string;  // manager's WA (fallback)
}

// The message itself goes to the customer on WhatsApp, where emoji are normal.
function buildMessage(p: Props): string {
  const lines: string[] = [
    `Salam ${p.clientName}! 👋`,
    '',
    `${p.destination} üzrə xüsusi hazırladığım tur paketi göndərdim.`,
    '',
  ];
  if (p.dateRange) lines.push(`📅 Tarix: ${p.dateRange}`);
  if (p.nights > 0) lines.push(`🌙 Müddət: ${p.nights} gecə`);
  lines.push(`🏨 ${p.hotelsCount} otel variantı`);
  lines.push('');
  lines.push('👇 Baxmaq üçün link:');
  lines.push(p.offerLink);
  lines.push('');
  lines.push('Hər hansı sualınız olsa, mənlə əlaqə saxlayın! 🤝');
  return lines.join('\n');
}

export default function WhatsAppMsgButton(props: Props) {
  const [open,   setOpen]   = useState(false);
  const [msg,    setMsg]    = useState('');
  const [copied, setCopied] = useState(false);

  function openModal() {
    setMsg(buildMessage(props));
    setOpen(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText(msg).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  // Prefer client's phone; fall back to manager's; fall back to universal picker
  const phone = (props.clientPhone ?? '').replace(/\D/g, '') || props.waNumber;
  const waHref = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <>
      <button onClick={openModal} title="Müştəriyə WhatsApp mesajı" className="btn btn-sm btn-primary">
        <WaIcon />
        WhatsApp
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="font-semibold text-ink">WhatsApp mesajı</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  {props.clientName} · lazım olsa mətni redaktə edin
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Bağla"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5">
              <textarea
                value={msg}
                onChange={e => setMsg(e.target.value)}
                rows={11}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-ink resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 leading-relaxed"
              />
            </div>

            <div className="flex gap-2 p-5 pt-3">
              <button onClick={handleCopy} className="btn btn-md btn-secondary flex-1">
                <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="btn btn-md btn-primary flex-1"
              >
                <WaIcon />
                Göndər
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function WaIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} flex-shrink-0`} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
