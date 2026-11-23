// ─── Email notification via Resend REST API ───────────────────────────────────
// No package needed — uses native fetch.
// Set RESEND_API_KEY in .env.local / Netlify env vars.
// Set RESEND_FROM_EMAIL to your verified domain sender (default: Resend test sender).

const FROM = process.env.RESEND_FROM_EMAIL ?? 'TourFlow <onboarding@resend.dev>';

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="az">
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:#0F172A;padding:20px 24px;display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">✈️</span>
      <span style="color:#fff;font-size:18px;font-weight:700">TourFlow</span>
    </div>
    <div style="padding:24px;color:#1e293b;font-size:15px;line-height:1.6">
      ${body}
    </div>
    <div style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:12px">TourFlow — Peşəkar Tur Təklif Sistemi</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendNotification({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  /** Raw inner HTML (will be wrapped in branded template) */
  body: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // skip silently — notifications are non-critical

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        html: wrapHtml(body),
      }),
    });
  } catch (err) {
    console.error('[email] sendNotification failed:', err);
  }
}
