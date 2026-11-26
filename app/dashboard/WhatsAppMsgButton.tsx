'use client';

import { useState } from 'react';

interface Props {
  clientName:  string;
  destination: string;
  dateRange:   string;
  nights:      number;
  hotelsCount: number;
  offerLink:   string;
  waNumber:    string;
}

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

  const waHref = `https://wa.me/${props.waNumber}?text=${encodeURIComponent(msg)}`;

  return (
    <>
      {/* Trigger button — rendered inside offer row */}
      <button
        onClick={openModal}
        title="WhatsApp mətni yarat"
        className="text-xs text-green-600 hover:text-green-500 font-semibold px-2 py-1 rounded-lg hover:bg-green-50 transition-colors flex-shrink-0"
      >
        📱 WA
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-[#111827] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">📱 WhatsApp Mətni</h3>
                <p className="text-slate-500 text-xs mt-0.5">Redaktə edib göndər</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Editable message */}
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              rows={10}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono leading-relaxed"
            />

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCopy}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  copied
                    ? 'bg-teal-500/30 text-teal-300'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {copied ? '✓ Kopyalandı' : '📋 Kopyala'}
              </button>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors text-center flex items-center justify-center gap-1.5"
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

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
