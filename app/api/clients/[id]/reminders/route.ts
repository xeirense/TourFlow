import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/clients/[id]/reminders ─────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: clientId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('client_id', clientId)
      .order('due_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/clients/[id]/reminders]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}

// ── POST /api/clients/[id]/reminders — create a reminder ────────────────────
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: clientId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // Verify access
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .or(`agency_owner_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
      .single();

    if (!client) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 403 });

    const { text, dueAt, kind } = await request.json() as {
      text: string;
      dueAt: string;
      kind?: string;
    };

    if (!text?.trim()) return NextResponse.json({ error: 'Mətn tələb olunur' }, { status: 400 });
    if (!dueAt)        return NextResponse.json({ error: 'Tarix tələb olunur' }, { status: 400 });

    const { data, error } = await supabase.from('reminders').insert({
      client_id:  clientId,
      manager_id: user.id,
      due_at:     dueAt,
      kind:       kind ?? 'manual',
      text:       text.trim(),
    }).select().single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/clients/[id]/reminders]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
