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

  -- Auth: links to the authenticated agency (nullable for legacy/anon offers)
  agency_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Branding (all optional – defaults to neutral "Səyahət Təklifi" in UI)
  agency_name      TEXT,
  agency_logo      TEXT,
  manager_name     TEXT,

  -- Contact (required)
  manager_whatsapp TEXT        NOT NULL,

  -- Trip details (required)
  client_name      TEXT        NOT NULL,
  destination      TEXT        NOT NULL,
  date_range       TEXT        NOT NULL DEFAULT '',
  nights           INTEGER     NOT NULL DEFAULT 0,
  passengers       TEXT        NOT NULL DEFAULT '',

  -- JSON arrays
  includes         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  hotels           JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- Analytics
  views_count      INTEGER     NOT NULL DEFAULT 0,
  selected_hotel   TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ          DEFAULT (NOW() + INTERVAL '90 days')
);

-- ── Agency profiles table ─────────────────────────────────────────────────────
-- One row per authenticated agency (linked to auth.users)
CREATE TABLE public.agency_profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name  TEXT,
  agency_logo  TEXT,
  whatsapp     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security – offers ───────────────────────────────────────────────
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Public can READ any offer (needed for /offer/[id] public links)
CREATE POLICY "Public read offers"
  ON public.offers
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE done via service key (bypasses RLS entirely)

-- ── Row Level Security – agency_profiles ──────────────────────────────────────
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own profile only
CREATE POLICY "Users manage own profile"
  ON public.agency_profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Helper RPC: atomic view counter increment ─────────────────────────────────
CREATE OR REPLACE FUNCTION increment_views(offer_id TEXT)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.offers
  SET views_count = views_count + 1
  WHERE id = offer_id;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX offers_created_at_idx ON public.offers (created_at DESC);
CREATE INDEX offers_agency_id_idx  ON public.offers (agency_id);

-- ============================================================
--  MIGRATION – Run this if you already created the table
--  (skip if running from scratch)
-- ============================================================

-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS selected_hotel TEXT;
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
-- ALTER TABLE public.offers ALTER COLUMN date_range SET DEFAULT '';
