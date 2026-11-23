import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email tələb olunur' }, { status: 400 });
    }

    // Build redirect URL dynamically from request host
    const reqHeaders = await headers();
    const host  = reqHeaders.get('host') ?? '';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${siteUrl}/reset-password` },
    );

    // Always return 200 — don't reveal whether email exists
    if (error) {
      console.error('[forgot-password]', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/forgot-password]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
