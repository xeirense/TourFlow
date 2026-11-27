import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { getBotUsername } from '@/lib/telegram';

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/telegram/connect — generates a 15-min one-time connect link for the logged-in user
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

  const token     = randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const db = adminDb();

  // Remove any existing tokens for this user (one at a time)
  await db.from('telegram_connect_tokens').delete().eq('agency_id', user.id);

  await db.from('telegram_connect_tokens').insert({
    token,
    agency_id:  user.id,
    expires_at: expiresAt.toISOString(),
  });

  const botUsername = getBotUsername();
  const deepLink    = botUsername ? `https://t.me/${botUsername}?start=${token}` : null;

  return NextResponse.json({ token, deepLink, expiresAt: expiresAt.toISOString() });
}
