import { NextRequest, NextResponse } from 'next/server';
import { supabase as adminClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { offerId, type, hotelName } = await request.json();

    if (!offerId || !type) {
      return NextResponse.json({ error: 'offerId və type tələb olunur' }, { status: 400 });
    }

    if (type === 'view') {
      // Atomically increment views_count via RPC
      await adminClient.rpc('increment_views', { offer_id: offerId });
    } else if (type === 'whatsapp_click') {
      // SECURITY DEFINER RPC — bypasses RLS, works without service key
      const { error } = await adminClient.rpc('select_offer_hotel', {
        p_offer_id:   offerId,
        p_hotel_name: hotelName ?? '',
      });
      if (error) console.error('[events/whatsapp_click]', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/events]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
