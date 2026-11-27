import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST /api/admin/run-cron
// Admin-only endpoint to trigger the reminder cron for a single agency (test mode).
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

  const { data: profile } = await supabase
    .from('agency_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Admin icazəsi tələb olunur' }, { status: 403 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const secret  = process.env.CRON_SECRET?.trim() ?? '';

  try {
    const res = await fetch(
      `${siteUrl}/api/cron/reminders?agency_filter=${encodeURIComponent(user.id)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
