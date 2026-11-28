'use client';

import { useState } from 'react';
import Icon from '@/app/components/Icon';

export default function CopyButton({ url, label = 'Link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleCopy} title="Linki kopyala" className="btn btn-sm btn-secondary">
      <Icon name={copied ? 'check' : 'link'} className="w-3.5 h-3.5" />
      {copied ? 'Kopyalandı' : label}
    </button>
  );
}
