import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const offer = await db.getOffer(id);

    if (!offer) {
      return NextResponse.json({ error: 'Təklif tapılmadı' }, { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (err) {
    console.error('[GET /api/offers/[id]]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
