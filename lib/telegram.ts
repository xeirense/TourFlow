// ─── Telegram Bot API helper ──────────────────────────────────────────────────
// Set TELEGRAM_BOT_TOKEN in env to enable. All functions no-op if not set.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();

/** Sends a Telegram message to a chat. No-op if TELEGRAM_BOT_TOKEN is not set. */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
): Promise<void> {
  if (!BOT_TOKEN) return; // optional integration — skip silently
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[telegram] sendMessage error:', err);
    }
  } catch (err) {
    console.error('[telegram] sendMessage failed:', err);
  }
}

/** Returns the bot username (without @) for building t.me deep links. */
export function getBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.trim() ?? null;
}

/**
 * Registers the bot webhook with Telegram (call once after each deployment).
 *
 * Or register manually:
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -d url=https://your-app.vercel.app/api/telegram/webhook \
 *     -d secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */
export async function setWebhook(webhookUrl: string, secretToken?: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const body: Record<string, string> = { url: webhookUrl };
    if (secretToken) body.secret_token = secretToken;
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      },
    );
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}
