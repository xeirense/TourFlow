import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabase as adminClient } from '@/lib/supabase';
import { getTrialDaysLeft, type PlanTier } from '@/lib/planConfig';

// Plans an agency can switch to by itself. Enterprise is arranged by contract.
const SELF_SERVE: PlanTier[] = ['starter', 'growth', 'pro'];

/**
 * POST /api/plan/change  { tier }
 *
 * During the free trial an agency owner can try any self-serve plan.
 * After the trial (no online payments yet) plan changes go through support,
 * so this returns 402 and the UI shows the contact option.
 * Plan columns are protected from direct user writes (V13), so the update is
 * done here with the service key after these checks.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { tier } = (await request.json()) as { tier?: PlanTier };
    if (!tier || !SELF_SERVE.includes(tier)) {
      return NextResponse.json({ error: 'Bu plana keçid üçün bizimlə əlaqə saxlayın' }, { status: 400 });
    }

    // Invited managers cannot change the agency plan
    const { data: membership } = await supabase
      .from('agency_members')
      .select('id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (membership) {
      return NextResponse.json({ error: 'Planı yalnız agentlik rəhbəri dəyişə bilər' }, { status: 403 });
    }

    const { data: profile } = await adminClient
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle<{ plan_tier: PlanTier; subscription_status: string; trial_ends_at: string | null }>();

    if (!profile) return NextResponse.json({ error: 'Profil tapılmadı' }, { status: 404 });

    const trialing = profile.subscription_status === 'trialing' && getTrialDaysLeft(profile.trial_ends_at) > 0;
    if (!trialing) {
      return NextResponse.json(
        { error: 'Sınaq müddəti bitib. Plan dəyişikliyi üçün bizimlə əlaqə saxlayın.', contact: true },
        { status: 402 },
      );
    }

    if (profile.plan_tier === tier) return NextResponse.json({ ok: true, tier });

    const { error } = await adminClient
      .from('agency_profiles')
      .update({ plan_tier: tier })
      .eq('id', user.id);

    if (error) {
      console.error('[POST /api/plan/change]', error.message);
      return NextResponse.json({ error: 'Plan dəyişdirilmədi. Yenidən cəhd edin.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tier });
  } catch (err) {
    console.error('[POST /api/plan/change]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
