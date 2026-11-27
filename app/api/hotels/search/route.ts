import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json([]);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data, error } = await supabase.rpc('search_hotels_v10', {
      query_text:   q,
      result_limit: 8,
    });

    if (error) {
      console.error('[GET /api/hotels/search] RPC error:', error.message);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/hotels/search]', err);
    return NextResponse.json([], { status: 200 });
  }
}
