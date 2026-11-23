import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, agencyName, agencyLogo, whatsapp } = await request.json();

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Email və şifrə tələb olunur' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifrə ən azı 6 simvol olmalıdır' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Use SSR client (carries user JWT from just-completed signUp → auth.uid() works in RLS)
    if (data.user) {
      await supabase.from('agency_profiles').upsert({
        id:          data.user.id,
        agency_name: agencyName?.trim() || null,
        agency_logo: agencyLogo?.trim() || null,
        whatsapp:    whatsapp?.trim()   || null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
