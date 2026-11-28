# 1. E-poçt göndərişinin qoşulması (SMTP)

## Niyə lazımdır

Supabase-in daxili poçt xidməti yalnız sınaq üçündür. Saatda təxminən 2 məktub göndərir və
çox vaxt yalnız Supabase layihəsinin komanda üzvlərinə çatdırır. Bu səbəbdən şifrə bərpa linkləri gəlmir.
Real agentliklər qeydiyyatdan keçəndə və şifrəsini bərpa edəndə məktub mütləq çatmalıdır.

## Variant A — Gmail (indi, domen olmadan, 10 dəqiqə)

Gündə ~500 məktuba qədər yetərlidir. Göndərən ünvan sizin Gmail olacaq.

1. **Google hesabında 2 addımlı yoxlamanı aktiv edin:**
   myaccount.google.com → Security → 2-Step Verification.
2. **Tətbiq şifrəsi (App password) yaradın:**
   myaccount.google.com → Security → App passwords → ad: `TourFlow` → **Create**.
   16 simvollu şifrəni kopyalayın. Bu şifrəni heç kimə göndərməyin.
3. **Supabase → Authentication → Emails → SMTP Settings → Enable Custom SMTP:**

   | Sahə | Dəyər |
   |---|---|
   | Sender email | Gmail ünvanınız |
   | Sender name | `TourFlow` |
   | Host | `smtp.gmail.com` |
   | Port | `465` |
   | Username | Gmail ünvanınız |
   | Password | 2-ci addımdakı 16 simvollu tətbiq şifrəsi |

   **Save** düyməsini basın.
4. **Limiti artırın:** Authentication → Rate Limits → *Rate limit for sending emails* → məsələn `30` / saat.
5. **Linklərin düzgün sayta getməsi üçün:** Authentication → URL Configuration:
   - Site URL: `https://tour-flow-nine.vercel.app`
   - Redirect URLs: `https://tour-flow-nine.vercel.app/**`
6. **Yoxlayın:** saytda *Şifrəni unutmusunuz?* → e-poçtunuzu yazın → məktub 1 dəqiqə ərzində gəlməlidir.
   Sonra Claude-a yazın, linkin düzgün işlədiyini birlikdə yoxlayaq.

## Variant B — Öz domeninizlə (sonra, peşəkar)

Domen alanda (məs. `tourflow.az`) **Resend** xidmətinə keçin: məktublar `noreply@tourflow.az` ünvanından gedəcək,
Spam-a düşmə ehtimalı azalacaq. Resend → Domains → domeni əlavə edin və göstərilən DNS qeydlərini domen
panelinə yazın. Sonra Supabase SMTP-də: Host `smtp.resend.com`, Port `465`, Username `resend`,
Password = Resend API açarı.

> Qeyd: saytın öz bildiriş məktubları (məs. “müştəri təklifə baxdı”) da Resend ilə gedir
> (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Domen təsdiqlənməyənə qədər Resend yalnız Resend hesabının
> sahibinə məktub göndərir.

## E-poçt şablonu (mütləq)

> **Vacib:** link `{{ .ConfirmationURL }}` deyil, aşağıdakı `/auth/confirm?token_hash=…` formatında olmalıdır.
> Belə olduqda link istənilən cihazda açılır (məs. sorğu kompüterdən, məktub telefonda).
> Site URL (Authentication → URL Configuration) `https://tour-flow-nine.vercel.app` olmalıdır.

Authentication → Emails → Templates → **Reset Password**:

- Subject: `TourFlow — şifrənin yenilənməsi`
- Body:

```html
<h2>Şifrənin yenilənməsi</h2>
<p>TourFlow hesabınız üçün şifrənin yenilənməsi tələb olunub.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Yeni şifrə təyin et</a></p>
<p>Bu tələbi siz etməmisinizsə, məktubu nəzərə almayın — şifrəniz dəyişməyəcək.</p>
```
