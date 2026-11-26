import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  PLANS,
  getEffectivePlan,
  getTrialDaysLeft,
  DEFAULT_PLAN_DATA,
  nextMonthReset,
  type ProfilePlanData,
} from '@/lib/planConfig';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data: profile } = await supabase
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<ProfilePlanData>();

    const p = profile ?? DEFAULT_PLAN_DATA;
    const effectiveTier = getEffectivePlan(p);
    const plan          = PLANS[effectiveTier];
    const trialDaysLeft = getTrialDaysLeft(p.trial_ends_at);

    // Reset monthly counter if stale
    let monthlyUsed = p.monthly_offers_used ?? 0;
    if (p.monthly_reset_at && new Date(p.monthly_reset_at) <= new Date()) {
      monthlyUsed = 0;
      await supabase
        .from('agency_profiles')
        .update({ monthly_offers_used: 0, monthly_reset_at: nextMonthReset() })
        .eq('id', user.id);
    }

    return NextResponse.json({
      tier:               effectiveTier,
      originalTier:       p.plan_tier,
      status:             p.subscription_status,
      trialDaysLeft,
      monthlyOffersUsed:  monthlyUsed,
      monthlyOfferLimit:  plan.limits.monthlyOfferLimit,
      memberLimit:        plan.limits.memberLimit,
      features:           plan.features,
    });
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
