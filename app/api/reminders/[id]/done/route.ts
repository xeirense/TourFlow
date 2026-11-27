import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

// ── PATCH /api/reminders/[id]/done — mark reminder as done ─────────────────
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data, error } = await supabase
      .from('reminders')
      .update({ done_at: new Date().toISOString() })
      .eq('id', id)
      .or(`manager_id.eq.${user.id}`)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/reminders/[id]/done]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
