import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ActivityType } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

// ── POST /api/clients/[id]/activities — add an activity ─────────────────────
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

    const { type, payload } = await request.json() as { type: ActivityType; payload?: Record<string, unknown> };

    if (!type) return NextResponse.json({ error: 'type tələb olunur' }, { status: 400 });

    const { data, error } = await supabase.from('client_activities').insert({
      client_id: clientId,
      type,
      payload:   payload ?? {},
    }).select().single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/clients/[id]/activities]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
