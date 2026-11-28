// Builds the Supabase Auth e-mail templates from one shared layout so every
// TourFlow e-mail looks the same. Run: node scripts/build-email-templates.mjs
// Output: docs/setup/email-templates/*.html (paste into Supabase → Auth → Emails → Templates)

import { writeFileSync, mkdirSync } from 'node:fs';

const SITE  = 'https://tour-flow-nine.vercel.app';
const FONT  = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK   = '#0B0F17';
const BLUE  = '#2F54D1';

function layout({ title, eyebrow, heading, intro, button, href, facts, note }) {
  const factRows = facts
    .map(([label, value]) => `
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#64748B;">${label}</td>
                      <td style="padding:6px 0;font-size:13px;color:${INK};font-weight:600;text-align:right;">${value}</td>
                    </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF1F5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF1F5;">
    <tr>
      <td align="center" style="padding:36px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background-color:${INK};border-radius:16px 16px 0 0;padding:22px 28px;font-family:${FONT};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:34px;height:34px;background-color:#FFFFFF;border-radius:9px;text-align:center;vertical-align:middle;font-size:12px;font-weight:800;letter-spacing:0.5px;color:${INK};">TF</td>
                        <td style="padding-left:11px;font-size:16px;font-weight:600;color:#FFFFFF;letter-spacing:-0.2px;">TourFlow</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-size:11px;color:#94A3B8;letter-spacing:1.2px;text-transform:uppercase;">${eyebrow}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:4px;background-color:${BLUE};font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#FFFFFF;padding:34px 28px 10px 28px;font-family:${FONT};border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
              <h1 style="margin:0 0 10px 0;font-size:24px;line-height:1.25;font-weight:700;color:${INK};letter-spacing:-0.4px;">${heading}</h1>
              <p style="margin:0 0 26px 0;font-size:15px;line-height:1.65;color:#475569;">${intro}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:10px;background-color:${BLUE};">
                    <a href="${href}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${button}&nbsp;&nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Facts box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${factRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="background-color:#FFFFFF;padding:22px 28px 30px 28px;font-family:${FONT};border:1px solid #E2E8F0;border-top:0;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:#94A3B8;">Düymə işləməsə, linki brauzerə kopyalayın:</p>
              <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:${BLUE};text-decoration:underline;">${href.replace('&', '&amp;')}</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 12px 0 12px;font-family:${FONT};font-size:12px;line-height:1.7;color:#94A3B8;text-align:center;">
              ${note}<br>
              <a href="${SITE}" style="color:#64748B;text-decoration:none;font-weight:600;">TourFlow</a> &middot; Azərbaycan tur agentlikləri üçün
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

const templates = {
  'reset-password': {
    subject: 'TourFlow — şifrənin yenilənməsi',
    title:   'Şifrənin yenilənməsi',
    eyebrow: 'Hesab təhlükəsizliyi',
    heading: 'Yeni şifrə təyin edin',
    intro:   'TourFlow hesabınız üçün şifrənin yenilənməsi tələb olunub. Aşağıdakı düymə ilə bir neçə saniyəyə yeni şifrə təyin edə bilərsiniz.',
    button:  'Yeni şifrə təyin et',
    href:    `${SITE}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`,
    facts:   [['Hesab', '{{ .Email }}'], ['Linkin etibarlılığı', '1 saat'], ['İstifadə', 'Bir dəfəlik']],
    note:    'Bu tələbi siz etməmisinizsə, məktubu nəzərə almayın — şifrəniz dəyişməyəcək.',
  },
  'confirm-signup': {
    subject: 'TourFlow — e-poçtunuzu təsdiqləyin',
    title:   'E-poçtun təsdiqi',
    eyebrow: 'Xoş gəlmisiniz',
    heading: 'Hesabınızı aktivləşdirin',
    intro:   'TourFlow-a qoşulduğunuz üçün təşəkkür edirik. E-poçt ünvanınızı təsdiqləyin — 14 günlük pulsuz sınaq dərhal başlayacaq.',
    button:  'E-poçtu təsdiqlə',
    href:    `${SITE}/auth/confirm?token_hash={{ .TokenHash }}&type=email`,
    facts:   [['Hesab', '{{ .Email }}'], ['Pulsuz sınaq', '14 gün']],
    note:    'Bu qeydiyyatı siz etməmisinizsə, məktubu nəzərə almayın.',
  },
};

mkdirSync('docs/setup/email-templates', { recursive: true });
for (const [name, t] of Object.entries(templates)) {
  const html = `<!-- Supabase → Authentication → Emails → Templates
     Subject: ${t.subject}
     Body: paste everything from <!DOCTYPE html> to the end. -->
${layout(t)}`;
  writeFileSync(`docs/setup/email-templates/${name}.html`, html);
  console.log('wrote', name, html.length, 'chars');
}
