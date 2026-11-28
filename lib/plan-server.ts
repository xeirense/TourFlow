import { supabase as adminClient } from './supabase';
import {
  PLANS,
  getEffectivePlan,
  type PlanFeatures,
  type ProfilePlanData,
} from './planConfig';

/**
 * Server-side plan check for an agency (by profile id).
 * Reads with the service key so it also works for anonymous customer requests.
 * Use this in API routes — the UI hiding a button is not enough on its own.
 */
export async function agencyHasFeature(agencyId: string, feature: keyof PlanFeatures): Promise<boolean> {
  const { data, error } = await adminClient
    .from('agency_profiles')
    .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
    .eq('id', agencyId)
    .maybeSingle<ProfilePlanData>();
  // Fail closed: if the plan can't be read, treat the feature as unavailable
  if (error || !data) {
    console.error('[agencyHasFeature] plan lookup failed', agencyId, error?.message ?? 'no row');
    return false;
  }
  return PLANS[getEffectivePlan(data)].features[feature];
}
