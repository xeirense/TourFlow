# 2. Supabase bazasının Frankfurta köçürülməsi

## Niyə

Baza hazırda **Tokioda** (`ap-northeast-1`). Azərbaycandan Tokioya hər sorğu ~0.3 saniyə çəkir.
Frankfurt (`eu-central-1`) Bakıya ən yaxın regiondur — saytın hər səhifəsi təxminən 2–3 dəfə tez açılacaq.

Supabase mövcud layihənin regionunu dəyişməyə imkan vermir: yeni layihə yaradılır və sayt ona qoşulur.
Hazırda bazada yalnız nümunə məlumatları olduğu üçün bunu **indi** etmək ən asandır.

## Addımlar

### A. Yeni layihə (siz, 5 dəqiqə)
1. supabase.com → **New project** → Region: **Central EU (Frankfurt)**.
2. Güclü verilənlər bazası şifrəsi seçin və təhlükəsiz yerdə saxlayın.

### B. Sxemi qurmaq (siz, SQL Editor)
Yeni layihədə SQL Editor-də bu faylları **sıra ilə** işlədin:
1. `supabase-schema.sql` — əsas cədvəllər, funksiyalar, icazələr, şəkil yaddaşı (v8 və v12 daxildir)
2. `supabase/migrations/v10_improvements.sql` — otel ləqəbləri, telefon normallaşdırması,
   xatırlatma qaydaları, bildiriş ayarları (**əsas faylda yoxdur, mütləq işlədin**)
3. `supabase/seed/hotels_seed.sql`
4. `supabase/seed/hotel_aliases.sql`

> `v11_merge_duplicate_hotels.sql` yeni bazada lazım deyil. Hər hansı faylda xəta çıxsa,
> xəta mətnini Claude-a göndərin.

### C. Parametrlər (siz)
1. **Authentication → URL Configuration** — 1-ci bələdçidəki kimi (Site URL və Redirect URLs).
2. **Authentication → Emails → SMTP** — 1-ci bələdçidəki kimi.
3. **Project Settings → API** bölməsindən üç dəyəri kopyalayın:
   `Project URL`, `anon / publishable` açar, `service_role / secret` açar.

### D. Saytı yeni bazaya qoşmaq (Vercel)
1. Vercel → layihə → **Settings → Environment Variables** — dəyişin:
   - `NEXT_PUBLIC_SUPABASE_URL` → yeni Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → yeni anon açar
   - `SUPABASE_SERVICE_KEY` → yeni service_role açar
2. Claude-a yazın — `vercel.json`-da server regionunu `hnd1` (Tokio) → `fra1` (Frankfurt) dəyişib
   yenidən deploy edəcək. **Bu ikisi birlikdə dəyişməlidir**, əks halda sayt yavaşlayar.
3. Kompüterinizdəki `.env.local` faylında da eyni üç dəyəri yeniləyin.

### E. Yoxlama
1. Saytda yenidən qeydiyyatdan keçin (köhnə hesablar yeni bazada yoxdur).
2. Claude nümunə müştəri və təklifləri yenidən yaradacaq və sürəti ölçəcək.
3. Hər şey işləyirsə, köhnə Tokio layihəsini bir həftə saxlayın, sonra silin.
