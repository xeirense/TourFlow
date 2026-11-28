import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getEffectivePlan, getTrialDaysLeft, DEFAULT_PLAN_DATA, type ProfilePlanData } from '@/lib/planConfig';
import { PageTitle } from '@/app/components/AppHeader';
import PlanPicker from './PlanPicker';

export const metadata: Metadata = { title: 'Plan' };

export default async function PlanPage() {
  const { supabase, user } = await getAuth();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<ProfilePlanData>(),
    supabase
      .from('agency_members')
      .select('id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  const p        = profile ?? DEFAULT_PLAN_DATA;
  const daysLeft = getTrialDaysLeft(p.trial_ends_at);
  const trialing = p.subscription_status === 'trialing' && daysLeft > 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageTitle
        title="Plan"
        subtitle={trialing ? `Pulsuz sınaq · ${daysLeft} gün qalıb` : 'Abunəniz və plan imkanları'}
        back={{ href: '/dashboard/settings', label: 'Parametrlər' }}
      />
      <PlanPicker
        current={trialing ? p.plan_tier : getEffectivePlan(p)}
        trialing={trialing}
        trialDaysLeft={daysLeft}
        canChange={!membership}
        supportWa={process.env.NEXT_PUBLIC_SUPPORT_WA ?? ''}
      />
    </main>
  );
}
