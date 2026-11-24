import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { OfferInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });
    }

    const body = (await request.json()) as OfferInput;

    // ── Basic validation ───────────────────────────────────────────────────────
    if (!body.managerWhatsapp?.trim()) {
      return NextResponse.json({ error: 'Menecerin WhatsApp nömrəsi tələb olunur' }, { status: 400 });
    }
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: 'Müştərinin adı tələb olunur' }, { status: 400 });
    }
    if (!body.destination?.trim()) {
      return NextResponse.json({ error: 'İstiqamət tələb olunur' }, { status: 400 });
    }
    if (!body.hotels?.length) {
      return NextResponse.json({ error: 'Ən azı bir otel əlavə edin' }, { status: 400 });
    }
    if (body.hotels.length > 5) {
      return NextResponse.json({ error: 'Maksimum 5 otel əlavə edilə bilər' }, { status: 400 });
    }

    // ── Insert via SECURITY DEFINER RPC (bypasses RLS, like increment_views) ──
    const { data: offerId, error } = await supabase.rpc('create_offer', {
      p_agency_id:        user.id,
      p_agency_name:      body.agencyName      ?? null,
      p_agency_logo:      body.agencyLogo      ?? null,
      p_manager_name:     body.managerName     ?? null,
      p_manager_whatsapp: body.managerWhatsapp,
      p_client_name:      body.clientName,
      p_destination:      body.destination,
      p_date_range:       body.dateRange       ?? '',
      p_nights:           body.nights          ?? 0,
      p_passengers:       body.passengers      ?? '',
      p_includes:         body.includes        ?? [],
      p_hotels:           body.hotels,
    });

    if (error) {
      console.error('[POST /api/offers] RPC error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: offerId }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/offers]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
