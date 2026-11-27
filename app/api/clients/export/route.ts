import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { PLANS, getEffectivePlan, DEFAULT_PLAN_DATA } from '@/lib/planConfig';

function csvEscape(val: unknown): string {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── GET /api/clients/export — download clients as CSV (Growth+ only) ────────
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // Plan gating
    const { data: profile } = await supabase
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at')
      .eq('id', user.id)
      .single();

    const planData   = profile ?? DEFAULT_PLAN_DATA;
    const tier       = getEffectivePlan(planData);
    const canExport  = PLANS[tier].features.clientExport;

    if (!canExport) {
      return NextResponse.json({ error: 'Bu funksiya Growth+ planı tələb edir' }, { status: 403 });
    }

    // Fetch only owner's clients for export
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('agency_owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const headers = [
      'Ad', 'Telefon', 'Email', 'Doğum tarixi', 'Mənbə', 'Teqlər',
      'Büdcə (min)', 'Büdcə (maks)', 'Valyuta',
      'Böyüklər', 'Uşaqlar',
      'İstiqamətlər', 'Ulduz', 'Qidalanma',
      'Qeyd', 'Yaradılıb',
    ];

    const rows = (clients ?? []).map(c => [
      c.full_name,
      c.phone,
      c.email ?? '',
      c.birthday ?? '',
      c.source,
      (c.tags as string[]).join('; '),
      c.budget_min ?? '',
      c.budget_max ?? '',
      c.currency,
      (c.travelers as { adults: number })?.adults ?? '',
      (c.travelers as { children: number })?.children ?? '',
      ((c.preferred_destinations as string[]) ?? []).join('; '),
      c.preferred_stars ?? '',
      c.preferred_meal ?? '',
      c.notes ?? '',
      new Date(c.created_at).toLocaleDateString('az-AZ'),
    ]);

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map(r => r.map(csvEscape).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="musteri-bazasi-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/clients/export]', err);
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
