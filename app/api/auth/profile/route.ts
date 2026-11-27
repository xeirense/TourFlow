import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // Use SSR client (carries user JWT → auth.uid() works in RLS)
    const { data: profile } = await supabase
      .from('agency_profiles')
      .select()
      .eq('id', user.id)
      .single();

    return NextResponse.json(profile ?? { id: user.id });
  } catch (err) {
    console.error('[GET /api/auth/profile]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { agencyName, agencyLogo, whatsapp, managerName } = await request.json();

    // Use SSR client (carries user JWT → auth.uid() works in RLS)
    await supabase.from('agency_profiles').upsert({
      id:           user.id,
      agency_name:  agencyName?.trim()  || null,
      agency_logo:  agencyLogo?.trim()  || null,
      whatsapp:     whatsapp?.trim()    || null,
      manager_name: managerName?.trim() || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/auth/profile]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
