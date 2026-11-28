import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/telegram/webhook — receives Telegram bot updates (set once via setWebhook)
export async function POST(request: NextRequest) {
  // Verify Telegram-sent secret token
  // The secret is required: without it anyone could post fake bot updates.
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error('[telegram/webhook] TELEGRAM_WEBHOOK_SECRET is not set — rejecting update');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (request.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId: number = message.chat?.id;
  const text: string   = (message.text ?? '').trim();

  if (!text.startsWith('/start')) return NextResponse.json({ ok: true });

  const token = text.split(' ')[1] ?? '';

  if (!token) {
    await sendTelegramMessage(
      chatId,
      '👋 Salam! TourFlow botuna xoş gəldiniz.\n\nAgentlik hesabınızı bağlamaq üçün TourFlow → Parametrlər bölməsindən "Telegram-a Bağla" düyməsini basın.',
    );
    return NextResponse.json({ ok: true });
  }

  const db = adminDb();

  const { data: tokenRow } = await db
    .from('telegram_connect_tokens')
    .select('agency_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!tokenRow) {
    await sendTelegramMessage(
      chatId,
      '❌ Bu link etibarsızdır. TourFlow → Parametrlər bölməsindən yeni link alın.',
    );
    return NextResponse.json({ ok: true });
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await db.from('telegram_connect_tokens').delete().eq('token', token);
    await sendTelegramMessage(
      chatId,
      '⏰ Linkin müddəti bitib (15 dəqiqə). Yeni link almaq üçün TourFlow-ya qayıdın.',
    );
    return NextResponse.json({ ok: true });
  }

  // Link this chat to the agency
  await db
    .from('agency_profiles')
    .update({ telegram_chat_id: chatId })
    .eq('id', tokenRow.agency_id);

  await db.from('telegram_connect_tokens').delete().eq('token', token);

  await sendTelegramMessage(
    chatId,
    '✅ <b>TourFlow hesabınız Telegram-a uğurla bağlandı!</b>\n\nBundan sonra müştəri bildirişlərini (baxış, cavab, xatırlatmalar) buradan alacaqsınız. 🎉',
  );

  return NextResponse.json({ ok: true });
}
