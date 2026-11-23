import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Şifrə ən azı 6 simvol olmalıdır' }, { status: 400 });
    }

    // SSR client carries the recovery token set by Supabase's redirect
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('[reset-password]', error.message);
      return NextResponse.json({ error: 'Şifrə yenilənmədi. Linkin müddəti bitmiş ola bilər.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
