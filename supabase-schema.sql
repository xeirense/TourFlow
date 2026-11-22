-- ============================================================
--  TourFlow – Supabase SQL Schema
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Needed for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Main offers table ─────────────────────────────────────────────────────────
CREATE TABLE public.offers (
  -- Short URL-safe hex ID (12 chars, e.g. "a3f9c1b2e4d8")
  id               TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),

  -- Branding (all optional – defaults to neutral "Səyahət Təklifi" in UI)
  agency_name      TEXT,
  agency_logo      TEXT,
  manager_name     TEXT,

  -- Contact (required)
  manager_whatsapp TEXT        NOT NULL,

  -- Trip details (required)
  client_name      TEXT        NOT NULL,
  destination      TEXT        NOT NULL,
  date_range       TEXT        NOT NULL,
  nights           INTEGER     NOT NULL DEFAULT 0,
  passengers       TEXT        NOT NULL DEFAULT '',

  -- JSON arrays
  includes         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  hotels           JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ          DEFAULT (NOW() + INTERVAL '90 days')
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- ✅ Public can READ offers (needed for /offer/[id] public links)
CREATE POLICY "Public read by ID"
  ON public.offers
  FOR SELECT
  USING (true);

-- ✅ INSERT is intentionally NOT granted to anon role.
--    Our API routes use SUPABASE_SERVICE_KEY which bypasses RLS entirely.
--    This means only our server can create offers — not random HTTP requests.

-- ── Performance index ─────────────────────────────────────────────────────────
CREATE INDEX offers_created_at_idx ON public.offers (created_at DESC);

-- ── Optional: view expired-soon offers ───────────────────────────────────────
-- SELECT id, client_name, destination, expires_at
-- FROM public.offers
-- WHERE expires_at < NOW() + INTERVAL '7 days'
-- ORDER BY expires_at;

-- ── Optional: auto-cleanup (requires pg_cron extension) ──────────────────────
-- SELECT cron.schedule('cleanup-expired-offers', '0 3 * * *',
--   $$DELETE FROM public.offers WHERE expires_at < NOW()$$);
