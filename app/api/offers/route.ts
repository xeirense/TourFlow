import { NextRequest, NextResponse, after } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  PLANS,
  getEffectivePlan,
  nextMonthReset,
  DEFAULT_PLAN_DATA,
  type ProfilePlanData,
} from '@/lib/planConfig';
import type { OfferInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 401 });
    }

    // ── Plan / limit check ─────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('agency_profiles')
      .select('plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at')
      .eq('id', user.id)
      .maybeSingle<ProfilePlanData>();

    const p             = profile ?? DEFAULT_PLAN_DATA;
    const effectiveTier = getEffectivePlan(p);
    const plan          = PLANS[effectiveTier];

    if (plan.limits.monthlyOfferLimit !== null) {
      // Reset monthly counter if stale
      let used = p.monthly_offers_used ?? 0;
      if (p.monthly_reset_at && new Date(p.monthly_reset_at) <= new Date()) {
        used = 0;
        await supabase
          .from('agency_profiles')
          .update({ monthly_offers_used: 0, monthly_reset_at: nextMonthReset() })
          .eq('id', user.id);
      }

      if (used >= plan.limits.monthlyOfferLimit) {
        return NextResponse.json(
          {
            error:        `Aylıq ${plan.limits.monthlyOfferLimit} təklif limitinə çatdınız. Limitsiz təklif üçün Growth paketinə keçin.`,
            limitReached: true,
            used,
            limit:        plan.limits.monthlyOfferLimit,
          },
          { status: 403 },
        );
      }
    }

    // ── Validation ─────────────────────────────────────────────────────────────
    const body = (await request.json()) as OfferInput;

    if (!body.managerWhatsapp?.trim()) {
      return NextResponse.json({ error: 'Menecerin WhatsApp nömrəsi tələb olunur' }, { status: 400 });
    }
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: 'Müştərinin adı tələb olunur' }, { status: 400 });
    }
    if (!body.destination?.trim()) {
      return NextResponse.json({ error: 'İstiqamət tələb olunur' }, { status: 400 });
    }
    if (!body.hotels?.length) {
      return NextResponse.json({ error: 'Ən azı bir otel əlavə edin' }, { status: 400 });
    }
    if (body.hotels.length > 5) {
      return NextResponse.json({ error: 'Maksimum 5 otel əlavə edilə bilər' }, { status: 400 });
    }

    // ── Insert via SECURITY DEFINER RPC ───────────────────────────────────────
    const { data: offerId, error } = await supabase.rpc('create_offer', {
      p_agency_id:        user.id,
      p_agency_name:      body.agencyName      ?? null,
      p_agency_logo:      body.agencyLogo      ?? null,
      p_manager_name:     body.managerName     ?? null,
      p_manager_whatsapp: body.managerWhatsapp,
      p_client_name:      body.clientName,
      p_destination:      body.destination,
      p_date_range:       body.dateRange       ?? '',
      p_nights:           body.nights          ?? 0,
      p_passengers:       body.passengers      ?? '',
      p_includes:         body.includes        ?? [],
      p_hotels:           body.hotels,
    });

    if (error) {
      console.error('[POST /api/offers] RPC error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Set extra V3 fields + increment offer counter ─────────────────────────
    if (offerId) {
      const patch: Record<string, unknown> = { created_by: user.id };
      if ((body as { parentOfferId?: string }).parentOfferId) {
        patch.parent_offer_id = (body as { parentOfferId?: string }).parentOfferId;
      }
      if ((body as { clientPhone?: string }).clientPhone?.trim()) {
        patch.client_phone = (body as { clientPhone?: string }).clientPhone!.trim();
      }
      if ((body as { clientId?: string }).clientId?.trim()) {
        patch.client_id = (body as { clientId?: string }).clientId!.trim();
      }
      const expiryDays = Math.min(30, Math.max(1, (body as { expiryDays?: number }).expiryDays ?? 3));
      patch.expires_at = new Date(Date.now() + expiryDays * 86_400_000).toISOString();

      const { error: patchErr } = await supabase
        .from('offers')
        .update(patch)
        .eq('id', offerId)
        .eq('agency_id', user.id);
      if (patchErr) {
        console.error('[POST /api/offers] patch update error:', patchErr.message);
      }

      // ── Non-critical work: activity log + hotel tracking + counter ─────────
      // Runs after the response is sent — doesn't block the client
      type HotelPayload = {
        catalogHotelId?: string; name?: string; city?: string; country?: string;
        stars?: number; mealType?: string; imageUrl?: string; sharePhoto?: boolean;
      };
      const hotelsSnapshot = body.hotels as HotelPayload[];
      const clientIdSnapshot = patch.client_id as string | undefined;
      const monthlyLimited = plan.limits.monthlyOfferLimit !== null;
      const monthlyUsedNow = p.monthly_offers_used ?? 0;

      after(async () => {
        // Log offer_sent activity for the client
        if (clientIdSnapshot) {
          const { error: actErr } = await supabase.from('client_activities').insert({
            client_id: clientIdSnapshot,
            type:      'offer_sent',
            payload:   { offer_id: offerId, destination: body.destination },
          });
          if (actErr) console.error('[POST /api/offers] activity insert error:', actErr.message);
        }

        // Hotel learning loop — run in parallel
        await Promise.all(hotelsSnapshot.map(h =>
          supabase.rpc('track_hotel_usage', {
            p_catalog_id: h.catalogHotelId ?? null,
            p_name:       h.name           ?? null,
            p_city:       h.city           ?? null,
            p_country:    h.country        ?? null,
            p_stars:      h.stars          ?? 5,
            p_meal:       h.mealType       ?? 'AI',
            p_agency_id:  user.id,
            p_photo_url:  (h.sharePhoto && h.imageUrl) ? h.imageUrl : null,
          }).then(({ error: e }) => {
            if (e) console.error('[POST /api/offers] track_hotel_usage error:', e.message);
          })
        ));

        // Increment monthly counter
        if (monthlyLimited) {
          await supabase
            .from('agency_profiles')
            .update({ monthly_offers_used: monthlyUsedNow + 1 })
            .eq('id', user.id);
        }
      });
    }

    return NextResponse.json({ id: offerId }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/offers]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
