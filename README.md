# TourFlow ✈️

**WhatsApp-first tour offer builder for travel agencies in Azerbaijan.**

TourFlow lets a travel-agency manager create a beautiful, branded hotel-offer link in minutes and send it to the client over WhatsApp. The client opens a mobile-friendly page, compares hotel options and replies with one tap — and the manager sees it on the dashboard.

> 🇦🇿 TourFlow — Azərbaycan turizm agentlikləri üçün B2B SaaS. Menecer bir neçə dəqiqəyə peşəkar otel təklifi linki yaradır, WhatsApp-la müştəriyə göndərir, müştəri isə bir kliklə cavab verir.

**Status:** MVP

---

## Problem

Agency managers still build offers by hand: screenshots, PDFs and long WhatsApp messages. One offer takes 20–40 minutes (estimate), looks unprofessional, and the agency never knows whether the client opened it or which hotel they liked.

## Solution

1. **Manager creates the offer**: destination, dates, travellers, what is included, and several hotel options with photos and prices.
2. **The link goes to WhatsApp**: the client opens a clean, branded mobile page.
3. **The client replies**: "Interested", "Price is high", "Not interested", or "I choose this hotel". The manager gets notified.

## MVP features

- **Multi-hotel offers**: stars, meal plan (BB / HB / FB / AI / UAI), AZN / USD / EUR, price per person or for the whole package
- **Image upload**: one photo per hotel (up to 5 MB) plus a short highlight note
- **Agency branding**: agency name, logo, manager name and WhatsApp number on the offer page
- **One-tap client response** and an "I choose this hotel" button that opens WhatsApp
- **Tracking & notifications**: view count, first open, hotel selection, email alerts via Resend
- **Manager dashboard**: sent offers, statuses, link copy, delete, offer expiry
- **Auth**: sign up, log in, forgot / reset password, agency profile settings
- **Azerbaijani-language UI**

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) (Postgres, Auth, Storage)
- Tailwind CSS
- [Resend](https://resend.com/) for email notifications
- Deployed on [Netlify](https://www.netlify.com/)

## Run locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

With `USE_MOCK_DB=true` in `.env.local`, offers are stored in a local `.mock-offers.json` file, so you can open public offer pages (`/offer/<id>`) without Supabase. The dashboard and offer creation need Supabase Auth: fill in the Supabase keys and run `supabase-schema.sql` in your project.

## Project structure

```
app/
  create/          offer builder (manager)
  dashboard/       sent offers, statuses, settings
  offer/[id]/      public offer page the client opens
  api/             offers, uploads, events, client responses, auth
lib/               database layer (Supabase or mock), email, types
supabase-schema.sql
```

## Business model

Monthly subscription per agency, priced in AZN: Start 39 AZN, Pro 89 AZN, Agency 199 AZN. Every plan comes with a 14-day free trial.
