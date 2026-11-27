import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { ClientSource } from '@/lib/types';

// ── GET /api/clients — list clients for current agency ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q       = searchParams.get('q')?.trim()     ?? '';
    const tag     = searchParams.get('tag')           ?? '';
    const source  = searchParams.get('source')        ?? '';
    const limit   = Math.min(200, parseInt(searchParams.get('limit') ?? '100', 10));

    let query = supabase
      .from('clients')
      .select(`
        id, full_name, phone, email, tags, source, budget_min, budget_max, currency,
        travelers, preferred_destinations, preferred_stars, preferred_meal,
        assigned_manager_id, created_at,
        offers(count)
      `)
      .or(`agency_owner_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/clients]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}

// ── POST /api/clients — create a new client ────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const body = await request.json();
    const {
      fullName, phone, email, birthday, notes, tags, source,
      budgetMin, budgetMax, currency, travelers,
      preferredDestinations, preferredStars, preferredMeal,
      assignedManagerId,
    } = body as {
      fullName: string;
      phone?: string;
      email?: string;
      birthday?: string;
      notes?: string;
      tags?: string[];
      source?: ClientSource;
      budgetMin?: number;
      budgetMax?: number;
      currency?: string;
      travelers?: { adults: number; children: number; child_ages: number[] };
      preferredDestinations?: string[];
      preferredStars?: number;
      preferredMeal?: string;
      assignedManagerId?: string;
    };

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Müştərinin adı tələb olunur' }, { status: 400 });
    }

    const { data, error } = await supabase.from('clients').insert({
      agency_owner_id:        user.id,
      assigned_manager_id:    assignedManagerId ?? null,
      full_name:              fullName.trim(),
      phone:                  phone?.trim() ?? '',
      email:                  email?.trim()   || null,
      birthday:               birthday        || null,
      notes:                  notes?.trim()   || null,
      tags:                   tags            ?? [],
      source:                 source          ?? 'whatsapp',
      budget_min:             budgetMin       ?? null,
      budget_max:             budgetMax       ?? null,
      currency:               currency        ?? 'AZN',
      travelers:              travelers       ?? { adults: 2, children: 0, child_ages: [] },
      preferred_destinations: preferredDestinations ?? [],
      preferred_stars:        preferredStars  ?? null,
      preferred_meal:         preferredMeal   ?? null,
    }).select().single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/clients]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
