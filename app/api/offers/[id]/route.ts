import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });
    }

    const { id } = await params;

    // .eq('agency_id', user.id) ensures RLS — users can only delete their own offers
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id)
      .eq('agency_id', user.id);

    if (error) {
      console.error('[DELETE /api/offers/[id]]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/offers/[id]]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
