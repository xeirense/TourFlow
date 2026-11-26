import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// ─── DELETE /api/team/[id] — remove a team member ────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { id } = await params;

    const { error } = await supabase
      .from('agency_members')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id); // RLS: only owner can delete

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}

// ─── PATCH /api/team/[id] — update member status (activate invited member) ───
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { id } = await params;
    const { memberUserId } = await request.json();

    const { data, error } = await supabase
      .from('agency_members')
      .update({
        member_user_id: memberUserId,
        status:         'active',
      })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
