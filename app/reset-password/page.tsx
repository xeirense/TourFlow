'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/Icon';

/**
 * Reached from the e-mail link via /auth/confirm, which verifies the token on
 * the server and sets a short-lived recovery cookie. Works on any device.
 */
function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [state,     setState]     = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [email,     setEmail]     = useState<string | null>(null);
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (params.get('error')) { setState('invalid'); return; }
    fetch('/api/auth/update-password')
      .then(r => r.json())
      .then(d => {
        setState(d.ready ? 'ready' : 'invalid');
        setEmail(d.email ?? null);
      })
      .catch(() => setState('invalid'));
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6)    { setError('Şifrə ən azı 6 simvol olmalıdır'); return; }
    if (password !== password2) { setError('Şifrələr uyğun gəlmir'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/update-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Şifrə yenilənmədi');
        if (res.status === 401 || res.status === 403) setState('invalid');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ink mb-4">
            <span className="text-sm font-bold text-white tracking-wide">TF</span>
          </div>
          <h1 className="text-ink font-semibold text-xl">Yeni şifrə</h1>
          <p className="text-slate-500 text-sm mt-1">
            {email ? <>Hesab: <span className="text-ink">{email}</span></> : 'Yeni şifrənizi daxil edin'}
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {state === 'checking' && (
            <div className="text-center py-6">
              <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-ink rounded-full animate-spin" />
              <p className="text-slate-500 text-sm mt-3">Link yoxlanılır…</p>
            </div>
          )}

          {state === 'invalid' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Icon name="clock" className="w-5 h-5" />
              </div>
              <p className="text-ink font-semibold">Link etibarsızdır və ya müddəti bitib</p>
              <p className="text-slate-500 text-sm">
                Şifrə bərpa linki 1 saat etibarlıdır və yalnız bir dəfə istifadə oluna bilər.
              </p>
              <Link href="/forgot-password" className="btn btn-md btn-dark">
                Yeni link al
              </Link>
            </div>
          )}

          {state === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Yeni şifrə</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ən azı 6 simvol"
                  autoComplete="new-password"
                  required
                  className="input h-11"
                />
              </div>
              <div>
                <label className="label">Təkrar</label>
                <input
                  type="password"
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  placeholder="Şifrəni yenidən daxil edin"
                  autoComplete="new-password"
                  required
                  className="input h-11"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-lg btn-primary w-full">
                {loading ? 'Yenilənir…' : 'Şifrəni yenilə'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link href="/login" className="text-brand-700 hover:underline">Girişə qayıt</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
