import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabase as adminClient } from '@/lib/supabase';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // ── Parse file ─────────────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Fayl seçilməyib' }, { status: 400 });
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Yalnız şəkil faylı yükləyə bilərsiniz' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Fayl 5 MB-dan böyük ola bilməz' }, { status: 400 });
    }

    // ── Upload to Supabase Storage ─────────────────────────────────────────────
    const ext      = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    const { data, error } = await adminClient.storage
      .from('hotel-images')
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = adminClient.storage
      .from('hotel-images')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Yükləmə zamanı xəta baş verdi' }, { status: 500 });
  }
}
