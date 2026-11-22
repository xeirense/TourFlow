import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { OfferInput } from '@/lib/types';

// Optional server-side guard: set API_SECRET in .env.local
// The create page sends this header automatically.
// If not set, the check is skipped (convenient for local dev).
const API_SECRET = process.env.API_SECRET;

export async function POST(request: NextRequest) {
  // ── Secret header check ───────────────────────────────────────────────────
  if (API_SECRET) {
    const headerSecret = request.headers.get('x-api-secret');
    if (headerSecret !== API_SECRET) {
      return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });
    }
  }

  try {
    const body = (await request.json()) as OfferInput;

    // ── Basic validation ──────────────────────────────────────────────────────
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

    const offer = await db.createOffer(body);
    return NextResponse.json({ id: offer.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/offers]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
