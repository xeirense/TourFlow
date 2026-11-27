import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// ── POST /api/clients/reassign — bulk reassign clients from one manager to another ──
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { fromManagerId, toManagerId } = await request.json() as {
      fromManagerId: string;
      toManagerId: string | null;
    };

    if (!fromManagerId) {
      return NextResponse.json({ error: 'fromManagerId tələb olunur' }, { status: 400 });
    }

    // Only agency owner can reassign
    const { error } = await supabase
      .from('clients')
      .update({ assigned_manager_id: toManagerId ?? null })
      .eq('agency_owner_id', user.id)
      .eq('assigned_manager_id', fromManagerId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/clients/reassign]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
