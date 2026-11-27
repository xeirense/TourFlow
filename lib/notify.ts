/**
 * TourFlow notification helper.
 * Currently wraps email (Resend). Future: Telegram via TELEGRAM_BOT_TOKEN.
 */
import { sendNotification } from './email';

export interface NotifyParams {
  to: string;        // recipient email address
  subject: string;
  body: string;      // plain-text or HTML fragment (will be wrapped)
}

/** Fire-and-forget notification — does not throw. */
export async function notify(params: NotifyParams): Promise<void> {
  await sendNotification(params);
}
