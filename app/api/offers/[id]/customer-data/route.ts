import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabase as adminClient } from '@/lib/supabase';
import { agencyHasFeature } from '@/lib/plan-server';

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

    // Favourites + note are a Growth+ feature of the agency that sent the offer
    const { data: offer } = await adminClient.from('offers').select('agency_id').eq('id', id).maybeSingle();
    if (!offer) return NextResponse.json({ error: 'Təklif tapılmadı' }, { status: 404 });
    if (!(await agencyHasFeature(offer.agency_id, 'customerFavorites'))) {
      return NextResponse.json({ error: 'Bu funksiya aktiv deyil' }, { status: 403 });
    }

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
