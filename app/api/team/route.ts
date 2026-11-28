import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  PLANS,
  getEffectivePlan,
  DEFAULT_PLAN_DATA,
  type ProfilePlanData,
} from '@/lib/planConfig';

// ─── GET /api/team — list team members for the current owner ──────────────────
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    const { data, error } = await supabase
      .from('agency_members')
      .select('id, member_user_id, invited_email, display_name, role, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}

// ─── POST /api/team — invite or add a team member ────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });

    // ── Plan / member-limit check ───────────────────────────────────────────
    const { data: profile } = await supabase
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<ProfilePlanData>();

    const p             = profile ?? DEFAULT_PLAN_DATA;
    const effectiveTier = getEffectivePlan(p);
    const plan          = PLANS[effectiveTier];

    if (plan.limits.memberLimit !== null) {
      const { count } = await supabase
        .from('agency_members')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // +1 for the owner themselves
      const totalMembers = (count ?? 0) + 1;
      if (totalMembers >= plan.limits.memberLimit) {
        return NextResponse.json(
          {
            error:              `Komanda limiti dolub (${plan.limits.memberLimit} nəfər, rəhbər daxil). Daha çox menecer üçün planınızı yüksəldin.`,
            memberLimitReached: true,
            limit:              plan.limits.memberLimit,
          },
          { status: 403 },
        );
      }
    }

    const { email, displayName } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email tələb olunur' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if already added
    const { data: existing } = await supabase
      .from('agency_members')
      .select('id')
      .eq('owner_id', user.id)
      .eq('invited_email', normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Bu email artıq komandaya əlavə edilib' }, { status: 409 });
    }

    // Try to find the user by email (via admin API if service key is available)
    // For now, insert with status 'invited' and no member_user_id
    const { data: member, error: insertError } = await supabase
      .from('agency_members')
      .insert({
        owner_id:       user.id,
        invited_email:  normalizedEmail,
        display_name:   displayName?.trim() || null,
        role:           'agent',
        status:         'invited',
        member_user_id: null,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Serverdə xəta' }, { status: 500 });
  }
}
