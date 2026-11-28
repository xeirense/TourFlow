import { supabase as adminClient } from './supabase';
import {
  PLANS,
  getEffectivePlan,
  DEFAULT_PLAN_DATA,
  type PlanFeatures,
  type ProfilePlanData,
} from './planConfig';

/**
 * Server-side plan check for an agency (by profile id).
 * Reads with the service key so it also works for anonymous customer requests.
 * Use this in API routes — the UI hiding a button is not enough on its own.
 */
export async function agencyHasFeature(agencyId: string, feature: keyof PlanFeatures): Promise<boolean> {
  const { data } = await adminClient
    .from('agency_profiles')
    .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
    .eq('id', agencyId)
    .maybeSingle<ProfilePlanData>();
  const tier = getEffectivePlan(data ?? DEFAULT_PLAN_DATA);
  return PLANS[tier].features[feature];
}
