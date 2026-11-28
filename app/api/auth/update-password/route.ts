import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { RECOVERY_COOKIE } from '@/lib/recovery';

/** GET — is there a valid recovery session (opened from the e-mail link)? */
export async function GET() {
  const jar = await cookies();
  if (jar.get(RECOVERY_COOKIE)?.value !== '1') return NextResponse.json({ ready: false });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ ready: !!user, email: user?.email ?? null });
}

/**
 * POST { password } — set a new password.
 * Only allowed within 15 minutes of opening the e-mail link (recovery cookie),
 * so an open, unattended session alone cannot change the password.
 */
export async function POST(request: NextRequest) {
  try {
    const jar = await cookies();
    if (jar.get(RECOVERY_COOKIE)?.value !== '1') {
      return NextResponse.json({ error: 'Linkin müddəti bitib. Yenidən link alın.' }, { status: 403 });
    }

    const { password } = (await request.json()) as { password?: string };
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Şifrə ən azı 6 simvol olmalıdır' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Linkin müddəti bitib. Yenidən link alın.' }, { status: 401 });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error('[update-password]', error.message);
      const msg = /different from the old/i.test(error.message)
        ? 'Yeni şifrə köhnə şifrədən fərqli olmalıdır'
        : 'Şifrə yenilənmədi. Yenidən cəhd edin.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(RECOVERY_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('[POST /api/auth/update-password]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
