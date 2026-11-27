import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * GET /api/hotels/last-price?hotelId=<catalogHotelId>
 *      or ?name=<hotelName>&city=<city>
 *
 * Returns the most recent price this agency used for the given hotel.
 * Never exposes data from other agencies (RLS enforced via user JWT).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId')?.trim();
    const name    = searchParams.get('name')?.trim();
    const city    = searchParams.get('city')?.trim();

    if (!hotelId && !name) {
      return NextResponse.json({ error: 'hotelId və ya name tələb olunur' }, { status: 400 });
    }

    // Build query: look for recent offers by this agency that contain this hotel
    // The hotels are stored as JSONB array inside offers.hotels
    // We use the offer's agency_id to scope to this agency only
    let query = supabase
      .from('offers')
      .select('hotels, created_at')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // scan last 50 offers

    const { data: offers } = await query;
    if (!offers?.length) return NextResponse.json(null);

    // Find the most recent hotel entry matching our criteria
    for (const offer of offers) {
      const hotels = offer.hotels as Array<{
        name?: string;
        city?: string;
        catalogHotelId?: string;
        price?: number;
        currency?: string;
        priceType?: string;
        mealType?: string;
      }>;
      if (!Array.isArray(hotels)) continue;

      for (const h of hotels) {
        const matchById   = hotelId && h.catalogHotelId === hotelId;
        const matchByName = !hotelId && name &&
          h.name?.toLowerCase() === name.toLowerCase() &&
          (!city || h.city?.toLowerCase() === city.toLowerCase());

        if (matchById || matchByName) {
          if (!h.price) continue;
          return NextResponse.json({
            price:     h.price,
            currency:  h.currency  ?? 'AZN',
            priceType: h.priceType ?? 'per_person',
            mealType:  h.mealType  ?? null,
            offeredAt: offer.created_at,
          });
        }
      }
    }

    return NextResponse.json(null);
  } catch (err) {
    console.error('[GET /api/hotels/last-price]', err);
    return NextResponse.json(null);
  }
}
