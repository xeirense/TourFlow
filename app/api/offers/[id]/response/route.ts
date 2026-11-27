import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notify } from '@/lib/notify';

// Admin client — bypasses RLS for auto-close of reminders (server-side, cron-like)
function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  );
}
const adminClient = adminDb();

const VALID_RESPONSES = ['interested', 'not_interested', 'price_high'] as const;
type ValidResponse = typeof VALID_RESPONSES[number];

const RESPONSE_LABELS: Record<ValidResponse, string> = {
  interested:     '✅ Maraqlanıram',
  not_interested: '❌ Maraqlanmıram',
  price_high:     '💬 Qiymət yüksəkdir',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { response } = await request.json() as { response: string };

    if (!VALID_RESPONSES.includes(response as ValidResponse)) {
      return NextResponse.json({ error: 'Yanlış cavab növü' }, { status: 400 });
    }

    // Update via SECURITY DEFINER RPC — no auth needed (public offer page)
    const { error } = await adminClient.rpc('set_customer_response', {
      p_offer_id: id,
      p_response: response,
    });

    if (error) {
      console.error('[POST /api/offers/[id]/response]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-close open reminders related to this offer (kind ends with :<offerId>)
    void adminClient
      .from('reminders')
      .update({ done_at: new Date().toISOString() })
      .like('kind', `%:${id}`)
      .is('done_at', null)
      .then(({ error: e }) => { if (e) console.error('[response/auto-close-reminders]', e.message); });

    // ── Notify manager via email (non-critical — fire and don't block) ─────────
    void (async () => {
      try {
        const { data: offer } = await adminClient
          .from('offers')
          .select('client_name, destination, agency_id')
          .eq('id', id)
          .single();

        if (!offer?.agency_id) return;

        const { data: userData } = await adminClient.auth.admin.getUserById(offer.agency_id);
        const managerEmail = userData?.user?.email;
        if (!managerEmail) return;

        await notify({
          to:           managerEmail,
          subject:      `TourFlow: ${offer.client_name} cavab verdi`,
          body: `
            <p>Müştəri <strong>${offer.client_name}</strong> <em>${offer.destination}</em> üzrə
            təklifinizə cavab verdi:</p>
            <p style="font-size:20px;font-weight:700;margin:16px 0">${RESPONSE_LABELS[response as ValidResponse]}</p>
            <p style="color:#64748b;font-size:13px">TourFlow Dashboard-da ətraflı məlumat əldə edin.</p>
          `,
          managerId:    offer.agency_id,
          telegramText: `${RESPONSE_LABELS[response as ValidResponse]} — ${offer.client_name} cavab verdi (${offer.destination})`,
          priority:     'HIGH',
        });
      } catch (notifyErr) {
        console.error('[response/notify]', notifyErr);
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/offers/[id]/response]', err);
    return NextResponse.json({ error: 'Serverdə xəta baş verdi' }, { status: 500 });
  }
}
