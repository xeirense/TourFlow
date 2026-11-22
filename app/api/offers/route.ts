import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { OfferInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // ── Get authenticated user ─────────────────────────────────────────────────
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

    const offer = await db.createOffer({ ...body, agencyId: user.id });
    return NextResponse.json({ id: offer.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/offers]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
