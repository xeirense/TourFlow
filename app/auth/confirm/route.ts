import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { RECOVERY_COOKIE } from '@/lib/recovery';

/**
 * GET /auth/confirm?token_hash=…&type=recovery
 *
 * Target of the e-mail links (see the Supabase "Reset password" template).
 * Verifies the one-time token on the server, which works on any device or
 * browser — unlike the PKCE flow, which only works in the browser that
 * requested the e-mail. For password recovery it also sets a short-lived
 * httpOnly cookie that /api/auth/update-password requires, so a new password
 * can only be set by someone who opened the e-mail link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type      = searchParams.get('type') as EmailOtpType | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/reset-password?error=invalid`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error('[auth/confirm]', error.message);
    const target = type === 'recovery' ? '/reset-password?error=expired' : '/login?error=link_expired';
    return NextResponse.redirect(`${origin}${target}`);
  }

  if (type === 'recovery') {
    const res = NextResponse.redirect(`${origin}/reset-password`);
    res.cookies.set(RECOVERY_COOKIE, '1', {
      httpOnly: true,
      secure:   origin.startsWith('https'),
      sameSite: 'lax',
      path:     '/',
      maxAge:   15 * 60, // 15 minutes to choose a new password
    });
    return res;
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
