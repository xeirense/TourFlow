import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// ─── GET /api/templates — list this user's templates ──────────────────────────
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data, error } = await supabase
      .from('offer_templates')
      .select('id, name, destination, nights, includes, note, created_at')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}

// ─── POST /api/templates — create a template ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const body = await request.json();
    const { name, destination, nights, includes, note } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Şablon adı tələb olunur' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('offer_templates')
      .insert({
        agency_id:   user.id,
        name:        name.trim(),
        destination: destination?.trim() ?? '',
        nights:      parseInt(nights) || 7,
        includes:    Array.isArray(includes) ? includes : [],
        note:        note?.trim() || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
