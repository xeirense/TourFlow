'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/app/components/Icon';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // true once Supabase fires PASSWORD_RECOVERY (token exchanged successfully)
  const [ready,     setReady]     = useState(false);
  const [invalid,   setInvalid]   = useState(false); // link expired / bad token
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    // The @supabase/ssr browser client automatically detects the
    // #access_token=...&type=recovery hash on mount and fires this event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Fallback: if no event fires within 4 s, the link is probably expired.
    const timer = setTimeout(() => {
      setInvalid(true);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once ready, cancel the "invalid" fallback timer effect
  useEffect(() => {
    if (ready) setInvalid(false);
  }, [ready]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('Şifrə ən azı 6 simvol olmalıdır'); return; }
    if (password !== password2)  { setError('Şifrələr uyğun gəlmir'); return; }
    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('Şifrə yenilənmədi. Linkin müddəti bitmiş ola bilər.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  }

  const inputCls = 'input h-11';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ink mb-4">
            <span className="text-sm font-bold text-white tracking-wide">TF</span>
          </div>
          <h1 className="text-ink font-semibold text-xl">Yeni Şifrə</h1>
          <p className="text-slate-500 text-sm mt-1">Yeni şifrənizi daxil edin</p>
        </div>

        <div className="card p-6 sm:p-8">
          {/* Expired / invalid link */}
          {!ready && invalid && (
            <div className="text-center space-y-4 py-2">
              <div className="text-4xl">⌛</div>
              <p className="text-ink font-semibold">Linkin müddəti bitib</p>
              <p className="text-slate-500 text-sm">
                Şifrə sıfırlama linki yalnız 1 saat etibarlıdır.
                Zəhmət olmasa yenidən sorğu göndərin.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block mt-2 text-brand-700 text-sm hover:underline"
              >
                Yenidən link al →
              </Link>
            </div>
          )}

          {/* Waiting for token exchange */}
          {!ready && !invalid && (
            <div className="text-center py-6">
              <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-ink rounded-full animate-spin" />
              <p className="text-slate-500 text-sm mt-3">Yüklənir…</p>
            </div>
          )}

          {/* Password form — only shown after PASSWORD_RECOVERY event */}
          {ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  Yeni şifrə
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ən azı 6 simvol"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="label">
                  Təkrar
                </label>
                <input
                  type="password"
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  placeholder="Şifrəni yenidən daxil edin"
                  required
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-lg btn-primary w-full"
              >
                {loading ? 'Yenilənir…' : 'Şifrəni yenilə'}
              </button>

              <p className="text-center text-xs text-slate-500">
                <Link href="/login" className="text-brand-700 hover:underline">
                  Girişə qayıt
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
