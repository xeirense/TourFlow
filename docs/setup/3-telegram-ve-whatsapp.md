# 3. Telegram botu və dəstək WhatsApp nömrəsi

## A. Dəstək WhatsApp nömrəsi (`NEXT_PUBLIC_SUPPORT_WA`) — 3 dəqiqə

Bu nömrə saytdakı “Bizimlə əlaqə”, “Planı yüksəlt”, Enterprise və limit mesajlarındakı düymələrdə istifadə olunur.
Agentliklər sizə bu nömrə ilə yazacaq.

1. Vercel → layihə → **Settings → Environment Variables** → **Add New**
   - Key: `NEXT_PUBLIC_SUPPORT_WA`
   - Value: nömrə yalnız rəqəmlərlə, ölkə kodu ilə: `994501234567` (`+`, boşluq, `0` olmadan)
   - Environments: **Production**, Preview, Development
2. **Redeploy:** `NEXT_PUBLIC_` ilə başlayan dəyişənlər build zamanı səhifəyə yazılır — əlavə etdikdən
   sonra Deployments → son deploy → ⋯ → **Redeploy**. (Və ya Claude-a yazın, o, yeni deploy edəcək.)
3. Eyni sətri kompüterdəki `.env.local` faylına da əlavə edin.

İstəsəniz eyni üsulla `NEXT_PUBLIC_CONTACT_EMAIL` (Məxfilik və Şərtlər səhifələrində göstərilən e-poçt) əlavə edin.

## B. Telegram botu — 15 dəqiqə

### 1. Botu yaradın (Telegram-da)
1. Telegram-da **@BotFather**-i açın → `/newbot`.
2. Botun adı (görünən ad): məsələn `TourFlow Bildirişlər`.
3. İstifadəçi adı (`bot` ilə bitməlidir): məsələn `TourFlowAzBot`.
4. BotFather sizə **token** verəcək: `123456789:AA…` — bu, botun şifrəsidir, heç kimə göndərməyin.
5. İstəyə görə: `/setdescription`, `/setuserpic` ilə təsvir və loqo əlavə edin.

### 2. Webhook sirri yaradın (kompüterdə)
Terminalda:
```bash
openssl rand -hex 32
```
Çıxan 64 simvollu sətri saxlayın — bu, Telegram-ın sayta göndərdiyi sorğuları təsdiqləyən sirdir.

### 3. Vercel-ə əlavə edin
Settings → Environment Variables (Production):

| Key | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather-in verdiyi token |
| `TELEGRAM_BOT_USERNAME` | botun istifadəçi adı, `@` olmadan (məs. `TourFlowAzBot`) |
| `TELEGRAM_WEBHOOK_SECRET` | 2-ci addımdakı sətir |

Sonra **Redeploy** edin.

### 4. Webhook-u qeydiyyatdan keçirin (bir dəfə, kompüterdə)
`<TOKEN>` və `<SECRET>` yerinə öz dəyərlərinizi yazın:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d url=https://tour-flow-nine.vercel.app/api/telegram/webhook \
  -d secret_token=<SECRET>
```
Cavab `{"ok":true,"result":true,…}` olmalıdır. Yoxlamaq üçün:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```
`url` sizin saytınızı göstərməli, `last_error_message` olmamalıdır.

### 5. Hesabı bota qoşun (saytda)
1. TourFlow → **Parametrlər → Telegram bildirişləri → Telegram-a qoş**.
2. **Telegram-da aç** → botda **Start**. Bot “TourFlow bildirişləri qoşuldu” yazmalıdır.
3. Saytda **Qoşuldu, yoxla** → **Test mesajı** — Telegram-a test bildirişi gəlməlidir.

Hər menecer bunu öz hesabından edir — bildirişlər hər kəsə ayrıca gəlir.

### Problem olarsa
- Bot cavab vermir → `getWebhookInfo` nəticəsini Claude-a göndərin.
- “Telegram botu hələ qoşulmayıb” xətası → `TELEGRAM_BOT_USERNAME` əlavə olunmayıb və ya Redeploy edilməyib.
- Token və ya sirr təsadüfən paylaşılıbsa → BotFather-də `/revoke`, yeni token ilə 3–4-cü addımları təkrarlayın.

## C. E-poçt (SMTP)
Ayrıca bələdçi: [1-email-smtp.md](1-email-smtp.md).
