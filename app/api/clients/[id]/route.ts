import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/clients/[id] — get client + recent offers + activities ──────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .or(`agency_owner_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
      .single();

    if (error || !client) return NextResponse.json({ error: 'Tapılmadı' }, { status: 404 });

    // Recent offers for this client
    const { data: offers } = await supabase
      .from('offers')
      .select('id, destination, date_range, hotels, created_at, views_count, status, customer_response, expires_at')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Activities
    const { data: activities } = await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Reminders
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('client_id', id)
      .order('due_at', { ascending: true });

    return NextResponse.json({ client, offers: offers ?? [], activities: activities ?? [], reminders: reminders ?? [] });
  } catch (err) {
    console.error('[GET /api/clients/[id]]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}

// ── PATCH /api/clients/[id] — update client fields ──────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // Verify ownership/assignment
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .or(`agency_owner_id.eq.${user.id},assigned_manager_id.eq.${user.id}`)
      .single();

    if (!existing) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 403 });

    const body = await request.json();

    // Map camelCase → snake_case for update
    const patch: Record<string, unknown> = {};
    if (body.fullName              !== undefined) patch.full_name              = body.fullName;
    if (body.phone                 !== undefined) patch.phone                  = body.phone;
    if (body.email                 !== undefined) patch.email                  = body.email     || null;
    if (body.birthday              !== undefined) patch.birthday               = body.birthday  || null;
    if (body.notes                 !== undefined) patch.notes                  = body.notes     || null;
    if (body.tags                  !== undefined) patch.tags                   = body.tags;
    if (body.source                !== undefined) patch.source                 = body.source;
    if (body.budgetMin             !== undefined) patch.budget_min             = body.budgetMin ?? null;
    if (body.budgetMax             !== undefined) patch.budget_max             = body.budgetMax ?? null;
    if (body.currency              !== undefined) patch.currency               = body.currency;
    if (body.travelers             !== undefined) patch.travelers              = body.travelers;
    if (body.preferredDestinations !== undefined) patch.preferred_destinations = body.preferredDestinations;
    if (body.preferredStars        !== undefined) patch.preferred_stars        = body.preferredStars ?? null;
    if (body.preferredMeal         !== undefined) patch.preferred_meal         = body.preferredMeal  ?? null;
    if (body.assignedManagerId     !== undefined) patch.assigned_manager_id    = body.assignedManagerId ?? null;
    if (body.doNotContact          !== undefined) patch.do_not_contact         = !!body.doNotContact;

    const { data, error } = await supabase.from('clients').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/clients/[id]]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
