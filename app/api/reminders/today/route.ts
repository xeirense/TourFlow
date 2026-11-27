import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// ── GET /api/reminders/today — today's due reminders for current user ────────
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data, error } = await supabase
      .from('reminders')
      .select('*, clients(full_name, phone)')
      .eq('manager_id', user.id)
      .lte('due_at', new Date().toISOString())
      .is('done_at', null)
      .order('due_at', { ascending: true })
      .limit(20);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/reminders/today]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
