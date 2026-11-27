import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notify } from '@/lib/notify';
import { PLANS, getEffectivePlan } from '@/lib/planConfig';
import type { SubscriptionStatus, PlanTier } from '@/lib/planConfig';

/** Admin client — bypasses RLS, used only in this cron handler */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── POST /api/cron/reminders — Vercel Cron, daily at 07:00 UTC ───────────────
export async function GET(request: NextRequest) {
  // Protect with CRON_SECRET
  const secret = process.env.CRON_SECRET?.trim();
  const auth   = request.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });
  }

  const db = adminClient();
  const now = new Date();
  let created = 0;
  let sent    = 0;
  const errors: string[] = [];

  // Support agency_filter for test/manual runs (limits processing to one agency)
  const agencyFilter = request.nextUrl.searchParams.get('agency_filter') ?? null;

  // Record this run in cron_runs for verifiability (07:00 UTC = 11:00 Baku time)
  const { data: runRow } = await db
    .from('cron_runs')
    .insert({ started_at: now.toISOString(), agency_filter: agencyFilter })
    .select('id')
    .single();
  const runId: number | null = runRow?.id ?? null;

  try {

    // ── 1. Load agencies with their plan tier (optionally filtered for test) ──
    let agencyQuery = db
      .from('agency_profiles')
      .select('id, plan_tier, subscription_status, trial_ends_at');
    if (agencyFilter) {
      agencyQuery = agencyQuery.eq('id', agencyFilter);
    }
    const { data: agencies } = await agencyQuery;

    const agencyAutoReminders = new Set<string>(
      (agencies ?? [])
        .filter(a => {
          const tier = getEffectivePlan({
            plan_tier:           a.plan_tier            as PlanTier,
            subscription_status: a.subscription_status  as SubscriptionStatus,
            trial_ends_at:       a.trial_ends_at,
          });
          return PLANS[tier].features.clientReminders;
        })
        .map(a => a.id as string)
    );

    // ── Helper: insert reminder if not already exists for this client+kind ─────
    async function maybeCreateReminder(
      clientId: string, managerId: string, dueAt: Date, kind: string, text: string
    ) {
      const { count } = await db
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('kind', kind)
        .gte('created_at', new Date(now.getTime() - 7 * 86_400_000).toISOString()); // no duplicate in past 7 days

      if ((count ?? 0) > 0) return;

      await db.from('reminders').insert({
        client_id:  clientId,
        manager_id: managerId,
        due_at:     dueAt.toISOString(),
        kind,
        text,
      });
      created++;
    }

    // ── 2. Rule: offer sent 24h+ ago, 0 views ─────────────────────────────────
    const cutoff24h = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const { data: unviewedOffers } = await db
      .from('offers')
      .select('id, client_id, client_name, agency_id, created_by, destination')
      .lt('created_at', cutoff24h)
      .eq('views_count', 0)
      .not('client_id', 'is', null)
      .not('agency_id', 'is', null);

    for (const offer of (unviewedOffers ?? [])) {
      if (!agencyAutoReminders.has(offer.agency_id)) continue;
      const managerId = offer.created_by ?? offer.agency_id;
      await maybeCreateReminder(
        offer.client_id,
        managerId,
        now,
        `offer_no_view:${offer.id}`,
        `${offer.client_name} hələ baxmayıb (${offer.destination}) — zəng et`,
      );
    }

    // ── 3. Rule: viewed 48h+ ago, no customer_response ───────────────────────
    const cutoff48h = new Date(now.getTime() - 48 * 3600_000).toISOString();
    const { data: viewedNoReply } = await db
      .from('offers')
      .select('id, client_id, client_name, agency_id, created_by, destination, last_viewed_at')
      .lt('last_viewed_at', cutoff48h)
      .gt('views_count', 0)
      .is('customer_response', null)
      .not('client_id', 'is', null)
      .not('agency_id', 'is', null);

    for (const offer of (viewedNoReply ?? [])) {
      if (!agencyAutoReminders.has(offer.agency_id)) continue;
      const managerId = offer.created_by ?? offer.agency_id;
      await maybeCreateReminder(
        offer.client_id,
        managerId,
        now,
        `offer_no_reply:${offer.id}`,
        `${offer.client_name} baxdı amma cavab vermədi (${offer.destination}) — izləmə zəngi et`,
      );
    }

    // ── 4. Rule: price_high response — suggest alt offer next day ────────────
    const { data: priceHigh } = await db
      .from('offers')
      .select('id, client_id, client_name, agency_id, created_by, destination')
      .eq('customer_response', 'price_high')
      .is('parent_offer_id', null)
      .not('client_id', 'is', null)
      .not('agency_id', 'is', null);

    for (const offer of (priceHigh ?? [])) {
      if (!agencyAutoReminders.has(offer.agency_id)) continue;
      const managerId = offer.created_by ?? offer.agency_id;
      const dueAt = new Date(now.getTime() + 86_400_000); // tomorrow
      await maybeCreateReminder(
        offer.client_id,
        managerId,
        dueAt,
        `price_high_alt:${offer.id}`,
        `${offer.client_name} qiymət yüksək dedi — alternativ təklif göndər`,
      );
    }

    // ── 5. Rule: trip_done 9 months ago → new season offer ───────────────────
    const nineMonthsAgo     = new Date(now.getTime() - 270 * 86_400_000).toISOString();
    const nineMonthsAgoCeil = new Date(now.getTime() - 263 * 86_400_000).toISOString(); // ±7d window
    const { data: tripDoneActivities } = await db
      .from('client_activities')
      .select('client_id, payload, clients(agency_owner_id, assigned_manager_id, full_name)')
      .eq('type', 'trip_done')
      .gte('created_at', nineMonthsAgo)
      .lte('created_at', nineMonthsAgoCeil);

    for (const act of (tripDoneActivities ?? [])) {
      const clientsArr = act.clients as unknown as { agency_owner_id: string; assigned_manager_id: string | null; full_name: string }[] | null;
      const c = Array.isArray(clientsArr) ? (clientsArr[0] ?? null) : null;
      if (!c) continue;
      if (!agencyAutoReminders.has(c.agency_owner_id)) continue;
      const managerId = c.assigned_manager_id ?? c.agency_owner_id;
      const destination = (act.payload as { destination?: string })?.destination ?? '';
      await maybeCreateReminder(
        act.client_id,
        managerId,
        now,
        `trip_done_9m:${act.client_id}`,
        `${c.full_name} keçən il ${destination ? `${destination}a` : 'səfərə'} getdi — yeni mövsüm təklifi göndər`,
      );
    }

    // ── 6. Rule: birthday in 3 days ───────────────────────────────────────────
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const monthStr = String(in3Days.getMonth() + 1).padStart(2, '0');
    const dayStr   = String(in3Days.getDate()).padStart(2, '0');

    const { data: bdayClients } = await db
      .from('clients')
      .select('id, full_name, agency_owner_id, assigned_manager_id, birthday')
      .not('birthday', 'is', null);

    for (const c of (bdayClients ?? [])) {
      if (!c.birthday) continue;
      const [, bMonth, bDay] = (c.birthday as string).split('-');
      if (bMonth !== monthStr || bDay !== dayStr) continue;
      if (!agencyAutoReminders.has(c.agency_owner_id)) continue;
      const managerId = c.assigned_manager_id ?? c.agency_owner_id;
      await maybeCreateReminder(
        c.id,
        managerId,
        now,
        `birthday:${c.id}:${in3Days.getFullYear()}`,
        `${c.full_name} xanımın doğum günü 3 gün qalır — xüsusi təklif hazırla`,
      );
    }

    // ── 7. Send email notifications for all due reminders ────────────────────
    const { data: dueReminders } = await db
      .from('reminders')
      .select('*, clients(full_name)')
      .lte('due_at', now.toISOString())
      .is('done_at', null);

    for (const reminder of (dueReminders ?? [])) {
      // Get manager email from auth.users
      const { data: { user } } = await db.auth.admin.getUserById(reminder.manager_id);
      if (!user?.email) continue;

      await notify({
        to:      user.email,
        subject: `TourFlow: ${reminder.text}`,
        body:    reminder.text,
      });
      sent++;
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    console.error('[cron/reminders]', err);
  } finally {
    // Update cron_runs with final result
    if (runId !== null) {
      await db.from('cron_runs').update({
        finished_at:   new Date().toISOString(),
        created_count: created,
        sent_count:    sent,
        error:         errors.length > 0 ? errors.join('; ') : null,
      }).eq('id', runId);
    }
  }

  return NextResponse.json({ ok: true, created, sent, errors });
}
