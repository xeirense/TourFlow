import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { OfferInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // ── Auth: use SSR client so JWT is forwarded (auth.uid() works in RLS) ─────
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

    // ── Insert using SSR client (carries user JWT → RLS auth.uid() works) ─────
    const { data: row, error } = await supabase
      .from('offers')
      .insert({
        agency_id:        user.id,
        agency_name:      body.agencyName      ?? null,
        agency_logo:      body.agencyLogo      ?? null,
        manager_name:     body.managerName     ?? null,
        manager_whatsapp: body.managerWhatsapp,
        client_name:      body.clientName,
        destination:      body.destination,
        date_range:       body.dateRange       ?? '',
        nights:           body.nights          ?? 0,
        passengers:       body.passengers      ?? '',
        includes:         body.includes        ?? [],
        hotels:           body.hotels,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[POST /api/offers] DB error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: row!.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/offers]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
