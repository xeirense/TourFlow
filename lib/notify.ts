/**
 * TourFlow notification helper.
 * Sends email via Resend + optionally Telegram to manager's linked chat.
 *
 * Priority levels:
 *   HIGH   — send immediately regardless of quiet hours
 *   NORMAL — rate-limited (max 1 per offer per 3h), skipped during quiet hours
 *   LOW    — skipped during quiet hours (digest only)
 */
import { sendNotification } from './email';
import { sendTelegramMessage } from './telegram';
import { createClient } from '@supabase/supabase-js';

export type NotifyPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface NotifyParams {
  to: string;            // recipient email address
  subject: string;
  body: string;          // HTML fragment for email (wrapped in branded template)
  managerId?: string;    // if provided, also sends Telegram to their linked chat
  telegramText?: string; // plain text for Telegram (defaults to subject if omitted)
  priority?: NotifyPriority; // default: 'NORMAL'
  offerId?: string;      // used for NORMAL rate-limiting (1 per offer per 3h)
  notifKind?: string;    // kind key stored in notification_log (e.g. 'view', 'response')
}

/** Returns current hour (0-23) in Baku time (UTC+4). */
function bakuHour(): number {
  return new Date(Date.now() + 4 * 60 * 60 * 1000).getUTCHours();
}

/** Returns true if current Baku time is within the given quiet window. */
function isQuietHour(quietStart: number, quietEnd: number): boolean {
  const h = bakuHour();
  if (quietStart > quietEnd) {
    // wraps midnight: e.g. 22-09 → quiet when h >= 22 OR h < 9
    return h >= quietStart || h < quietEnd;
  }
  return h >= quietStart && h < quietEnd;
}

/** Fire-and-forget notification — does not throw. */
export async function notify(params: NotifyParams): Promise<void> {
  const priority = params.priority ?? 'NORMAL';

  // 1. Email (always sent — email is managed by Resend's own rate limits)
  await sendNotification({ to: params.to, subject: params.subject, body: params.body });

  // 2. Telegram (optional — only when managerId is provided)
  if (!params.managerId) return;

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } },
    );

    // Load manager profile: telegram_chat_id + notification_settings
    const { data: profile } = await db
      .from('agency_profiles')
      .select('telegram_chat_id, notification_settings')
      .eq('id', params.managerId)
      .maybeSingle();

    if (!profile?.telegram_chat_id) return;

    const settings = (profile.notification_settings ?? {}) as {
      quietStart?: number;
      quietEnd?: number;
      highEnabled?: boolean;
      normalEnabled?: boolean;
      lowEnabled?: boolean;
    };

    const quietStart = settings.quietStart ?? 22;
    const quietEnd   = settings.quietEnd   ?? 9;
    const quiet      = isQuietHour(quietStart, quietEnd);

    // Respect per-priority toggles
    if (priority === 'HIGH'   && settings.highEnabled   === false) return;
    if (priority === 'NORMAL' && settings.normalEnabled === false) return;
    if (priority === 'LOW'    && settings.lowEnabled    === false) return;

    // HIGH bypasses quiet hours; NORMAL and LOW are silenced
    if (priority !== 'HIGH' && quiet) return;

    // NORMAL: rate-limit — at most 1 Telegram message per (manager, offer, kind) per 3 hours
    if (priority === 'NORMAL' && params.offerId && params.notifKind) {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { count } = await db
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .eq('manager_id', params.managerId)
        .eq('offer_id',   params.offerId)
        .eq('kind',       params.notifKind)
        .gte('sent_at',   threeHoursAgo);

      if ((count ?? 0) > 0) return; // sent within last 3 hours — skip

      // Log this send before sending (upsert handles retries)
      try {
        await db.from('notification_log').upsert({
          manager_id:    params.managerId,
          offer_id:      params.offerId,
          kind:          params.notifKind,
          sent_at:       new Date().toISOString(),
          pending_count: 0,
        }, { onConflict: 'manager_id,offer_id,kind' });
      } catch { /* non-critical — continue even if log fails */ }
    }

    await sendTelegramMessage(
      profile.telegram_chat_id,
      params.telegramText ?? params.subject,
    );
  } catch (err) {
    console.error('[notify/telegram]', err);
  }
}
