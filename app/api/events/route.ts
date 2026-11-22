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
      await adminClient
        .from('offers')
        .update({
          selected_hotel: hotelName ?? null,
          status: 'selected',
        })
        .eq('id', offerId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/events]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
