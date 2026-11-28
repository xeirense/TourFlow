import { NextRequest, NextResponse } from 'next/server';
import { supabase as adminClient } from '@/lib/supabase';
import { notify } from '@/lib/notify';

async function getManagerEmail(agencyId: string): Promise<string | null> {
  try {
    const { data } = await adminClient.auth.admin.getUserById(agencyId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { offerId, type, hotelName } = await request.json();

    if (!offerId || !type) {
      return NextResponse.json({ error: 'offerId və type tələb olunur' }, { status: 400 });
    }

    if (type === 'view') {
      // Atomically increment views_count + set last_viewed_at via RPC
      await adminClient.rpc('increment_views', { offer_id: offerId });

      // Notification: HIGH on first view, NORMAL (rate-limited) on subsequent views
      void (async () => {
        try {
          const { data: offer } = await adminClient
            .from('offers')
            .select('views_count, client_name, destination, agency_id')
            .eq('id', offerId)
            .single();

          if (!offer?.agency_id) return;

          const isFirstView = offer.views_count === 1;
          const email = await getManagerEmail(offer.agency_id);
          if (!email) return;

          await notify({
            to:           email,
            subject:      isFirstView
              ? `TourFlow: ${offer.client_name} təklifinizə baxdı`
              : `TourFlow: ${offer.client_name} yenidən baxdı`,
            body: isFirstView
              ? `
                <p>Müştəri <strong>${offer.client_name}</strong> <em>${offer.destination}</em> üzrə
                göndərdiyiniz təklifi <strong>ilk dəfə açdı</strong>.</p>
                <p style="color:#64748b;font-size:13px">Dashboard-da cavabı izləyin.</p>
              `
              : `
                <p>Müştəri <strong>${offer.client_name}</strong> <em>${offer.destination}</em> üzrə
                təklifinizə <strong>yenidən baxdı</strong> (cəmi ${offer.views_count} baxış).</p>
              `,
            managerId:    offer.agency_id,
            telegramText: isFirstView
              ? `👁 ${offer.client_name} təklifinizə ilk dəfə baxdı (${offer.destination})`
              : `👁 ${offer.client_name} yenidən baxdı — ${offer.views_count} baxış (${offer.destination})`,
            priority:     isFirstView ? 'HIGH' : 'NORMAL',
            offerId:      offerId,
            notifKind:    'view',
          });
        } catch (err) {
          console.error('[events/view/notify]', err);
        }
      })();

    } else if (type === 'whatsapp_click') {
      // SECURITY DEFINER RPC — bypasses RLS, works without service key
      const { error } = await adminClient.rpc('select_offer_hotel', {
        p_offer_id:   offerId,
        p_hotel_name: hotelName ?? '',
      });
      if (error) console.error('[events/whatsapp_click]', error.message);

      // Auto-close open reminders for this offer when customer selects a hotel
      void adminClient
        .from('reminders')
        .update({ done_at: new Date().toISOString() })
        .like('kind', `%:${offerId}`)
        .is('done_at', null)
        .then(({ error: e }) => { if (e) console.error('[whatsapp_click/auto-close]', e.message); });

      // Hot-lead notification: customer clicked WhatsApp for a specific hotel
      void (async () => {
        try {
          const { data: offer } = await adminClient
            .from('offers')
            .select('client_name, destination, agency_id')
            .eq('id', offerId)
            .single();

          if (!offer?.agency_id) return;

          const email = await getManagerEmail(offer.agency_id);
          if (!email) return;

          await notify({
            to:           email,
            subject:      `TourFlow: ${offer.client_name} otel seçdi`,
            body: `
              <p>Müştəri <strong>${offer.client_name}</strong> <em>${offer.destination}</em> üzrə
              <strong>${hotelName ?? 'bir oteli'}</strong> seçib WhatsApp-a keçdi.</p>
              <p style="font-size:16px;font-weight:600;color:#0B0F17;margin:12px 0">
                Müştəri satın almağa hazırdır — mümkün qədər tez əlaqə saxlayın.
              </p>
            `,
            managerId:    offer.agency_id,
            telegramText: `✅ ${offer.client_name} otel seçdi: ${hotelName ?? '—'} (${offer.destination}). Tez əlaqə saxlayın.`,
            priority:     'HIGH',
          });
        } catch (err) {
          console.error('[events/whatsapp_click/notify]', err);
        }
      })();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/events]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
