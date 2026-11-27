import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * PATCH /api/reminders/[id]/snooze
 * Sets due_at to tomorrow at 10:00 Baku time (UTC+4 → 06:00 UTC).
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // Tomorrow 10:00 Baku time = tomorrow 06:00 UTC
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(6, 0, 0, 0); // 06:00 UTC = 10:00 Baku (UTC+4)

    const { error } = await supabase
      .from('reminders')
      .update({ due_at: tomorrow.toISOString() })
      .eq('id', id)
      .eq('manager_id', user.id); // only own reminders

    if (error) throw error;

    return NextResponse.json({ ok: true, dueAt: tomorrow.toISOString() });
  } catch (err) {
    console.error('[PATCH /api/reminders/[id]/snooze]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
