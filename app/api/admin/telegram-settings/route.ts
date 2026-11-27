import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET    /api/admin/telegram-settings — returns Telegram connection status
// DELETE /api/admin/telegram-settings — disconnects Telegram from this account

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

  const { data: profile } = await supabase
    .from('agency_profiles')
    .select('telegram_chat_id')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: !!profile?.telegram_chat_id,
    chatId:    profile?.telegram_chat_id ?? null,
  });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

  await supabase
    .from('agency_profiles')
    .update({ telegram_chat_id: null })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
