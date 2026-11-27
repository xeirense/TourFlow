'use client';

import { useState } from 'react';

interface CronResult {
  ok?: boolean;
  created?: number;
  sent?: number;
  errors?: string[];
  error?: string;
}

export default function TestCronButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<CronResult | null>(null);

  async function handleTest() {
    setLoading(true);
    setResult(null);
    try {
      const res  = await fetch('/api/admin/run-cron', { method: 'POST' });
      const data = await res.json() as CronResult;
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleTest}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors font-semibold"
      >
        {loading ? 'İşləyir...' : '🔧 Test Cron (yalnız sizin agentlik)'}
      </button>
      {result && (
        <pre className="text-[10px] bg-slate-800 text-green-300 px-3 py-2 rounded-xl overflow-auto max-h-32">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
