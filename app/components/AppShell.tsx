import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  PLANS,
  getEffectivePlan,
  getTrialDaysLeft,
  DEFAULT_PLAN_DATA,
  type ProfilePlanData,
} from '@/lib/planConfig';
import AppHeader from './AppHeader';

interface ProfileRow extends ProfilePlanData {
  agency_name: string | null;
  is_admin:    boolean | null;
}

/** Shared chrome for every signed-in page: header + page background. */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, teamRes] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('agency_name, is_admin, plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from('agency_members')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
  ]);

  const profile  = profileRes.data;
  const planData = profile ?? DEFAULT_PLAN_DATA;
  const tier     = getEffectivePlan(planData);
  const plan     = PLANS[tier];
  const daysLeft = getTrialDaysLeft(planData.trial_ends_at);
  const trialing = planData.subscription_status === 'trialing' && daysLeft > 0;
  const used     = planData.monthly_offers_used ?? 0;
  const limit    = plan.limits.monthlyOfferLimit;

  let planNote: string | null = null;
  let planUrgent = false;
  if (trialing) {
    planNote   = `Sınaq · ${daysLeft} gün`;
    planUrgent = daysLeft <= 3;
  } else if (limit) {
    planNote   = `${used}/${limit} təklif`;
    planUrgent = used >= limit * 0.8;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        agencyName={profile?.agency_name || user.email || 'Agentlik'}
        planLabel={plan.name}
        planNote={planNote}
        planUrgent={planUrgent}
        isAdmin={!!profile?.is_admin}
        teamCount={teamRes.count ?? 0}
      />
      {children}
    </div>
  );
}
