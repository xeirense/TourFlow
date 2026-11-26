import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * POST /api/offers/[id]/customer-data
 * Public endpoint — no auth required (customers are not logged in).
 * Saves customer favorites (array of hotel names) and note to the offer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { favorites, note } = await request.json();

    const supabase = await createSupabaseServerClient();

    // Save favorites via SECURITY DEFINER function (bypasses RLS)
    if (Array.isArray(favorites)) {
      const { error: favError } = await supabase.rpc('set_customer_favorites', {
        p_offer_id:  id,
        p_favorites: favorites,
      });
      if (favError) {
        console.error('[customer-data] favorites:', favError.message);
      }
    }

    // Save note via SECURITY DEFINER function
    if (typeof note === 'string') {
      const { error: noteError } = await supabase.rpc('set_customer_note', {
        p_offer_id: id,
        p_note:     note.trim() || null,
      });
      if (noteError) {
        console.error('[customer-data] note:', noteError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
