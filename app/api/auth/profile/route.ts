import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabase as adminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data: profile } = await adminClient
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

    const { agencyName, agencyLogo, whatsapp } = await request.json();

    await adminClient.from('agency_profiles').upsert({
      id:          user.id,
      agency_name: agencyName?.trim() || null,
      agency_logo: agencyLogo?.trim() || null,
      whatsapp:    whatsapp?.trim()   || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/auth/profile]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
