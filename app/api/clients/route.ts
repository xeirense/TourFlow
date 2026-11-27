import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { normalizePhone } from '@/lib/phone';
import type { ClientSource } from '@/lib/types';

// ── GET /api/clients — list clients for current agency ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q           = searchParams.get('q')?.trim()           ?? '';
    const phoneExact  = searchParams.get('phone_exact')?.trim() ?? '';
    const tag         = searchParams.get('tag')                 ?? '';
    const source      = searchParams.get('source')              ?? '';
    const limit       = Math.min(200, parseInt(searchParams.get('limit') ?? '100', 10));

    // Exact phone match check (used by create page for duplicate detection)
    if (phoneExact) {
      const norm = normalizePhone(phoneExact);
      const { data: match } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('agency_owner_id', user.id)
        .eq('normalized_phone', norm)
        .maybeSingle();
      return NextResponse.json(match ?? null);
    }

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
      // Sanitize: strip PostgREST filter special chars to prevent injection
      const safeQ = q.replace(/[%,.()\[\]:]/g, '');
      if (safeQ) {
        query = query.or(`full_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);
      }
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

    const normalizedPhone = phone?.trim() ? normalizePhone(phone.trim()) : '';

    // Duplicate phone check: if a client with this normalized phone already exists for this agency, return 409
    if (normalizedPhone) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('agency_owner_id', user.id)
        .eq('normalized_phone', normalizedPhone)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'duplicate_phone', existingId: existing.id, existingName: existing.full_name },
          { status: 409 },
        );
      }
    }

    const { data, error } = await supabase.from('clients').insert({
      agency_owner_id:        user.id,
      assigned_manager_id:    assignedManagerId ?? null,
      full_name:              fullName.trim(),
      phone:                  normalizedPhone || phone?.trim() || '',
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
