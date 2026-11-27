import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { sendTelegramMessage } from '@/lib/telegram';

// POST /api/admin/telegram-test — sends a test message to verify Telegram connection
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

  const { data: profile } = await supabase
    .from('agency_profiles')
    .select('telegram_chat_id, agency_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.telegram_chat_id) {
    return NextResponse.json({ error: 'Telegram bağlı deyil' }, { status: 400 });
  }

  await sendTelegramMessage(
    profile.telegram_chat_id,
    `✅ <b>TourFlow Test Bildirişi</b>\n\n${profile.agency_name ?? 'Agentliyiniz'} üçün Telegram bildirişləri aktivdir!\n\n🔔 Bundan sonra müştəri fəaliyyətlərini (baxış, cavab, xatırlatmalar) buradan görəcəksiniz.`,
  );

  return NextResponse.json({ ok: true });
}
