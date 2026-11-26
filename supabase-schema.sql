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

-- Authenticated users can INSERT their own offers (agency_id must match JWT uid)
CREATE POLICY "Auth users insert own offers"
  ON public.offers
  FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = auth.uid());

-- Authenticated users can SELECT their own offers (in addition to public read)
-- (public read policy already covers this, kept for clarity)

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

-- ── Helper RPC: set selected hotel when customer clicks WhatsApp ───────────────
CREATE OR REPLACE FUNCTION select_offer_hotel(p_offer_id TEXT, p_hotel_name TEXT)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.offers
  SET selected_hotel = p_hotel_name,
      status         = 'selected'
  WHERE id = p_offer_id;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX offers_created_at_idx ON public.offers (created_at DESC);
CREATE INDEX offers_agency_id_idx  ON public.offers (agency_id);

-- ============================================================
--  MIGRATION – Run this if you already created the table
--  (skip if running from scratch)
-- ============================================================

-- Column migrations (uncomment if table already existed before these columns)
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS selected_hotel TEXT;
-- ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
-- ALTER TABLE public.offers ALTER COLUMN date_range SET DEFAULT '';

-- ── RLS + Function migrations (run these if DB already existed) ───────────────
-- CREATE POLICY "Auth users insert own offers" ON public.offers FOR INSERT TO authenticated WITH CHECK (agency_id = auth.uid());
--
-- CREATE OR REPLACE FUNCTION select_offer_hotel(p_offer_id TEXT, p_hotel_name TEXT)
-- RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
--   UPDATE public.offers SET selected_hotel = p_hotel_name, status = 'selected' WHERE id = p_offer_id;
-- $$;

-- ============================================================
--  V2 MIGRATION – Customer responses, delete, notifications
--  Run this block if you already have the v1 table
-- ============================================================

-- New columns
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS customer_response TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_viewed_at    TIMESTAMPTZ  DEFAULT NULL;

-- DELETE policy: agencies can delete their own offers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'offers' AND policyname = 'Users delete own offers'
  ) THEN
    CREATE POLICY "Users delete own offers"
      ON public.offers FOR DELETE TO authenticated
      USING (agency_id = auth.uid());
  END IF;
END $$;

-- Update increment_views to also track last_viewed_at
CREATE OR REPLACE FUNCTION increment_views(offer_id TEXT)
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.offers
  SET views_count    = views_count + 1,
      last_viewed_at = NOW()
  WHERE id = offer_id;
$$;

-- Customer feedback response (no auth needed — called from public offer page)
CREATE OR REPLACE FUNCTION set_customer_response(p_offer_id TEXT, p_response TEXT)
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.offers
  SET customer_response = p_response
  WHERE id = p_offer_id;
$$;

-- ============================================================
--  V3 MIGRATION – Alternative Offers, Templates, Team, Customer Notes
--  Run this in Supabase SQL Editor (safe to run on existing tables)
-- ============================================================

-- ── 1. New columns on offers ───────────────────────────────────────────────────
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS parent_offer_id    TEXT         REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_favorites JSONB        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_note      TEXT         DEFAULT NULL;

-- ── 2. UPDATE policy for offers (needed to set parent_offer_id/created_by) ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Users update own offers'
  ) THEN
    CREATE POLICY "Users update own offers"
      ON public.offers FOR UPDATE TO authenticated
      USING (agency_id = auth.uid())
      WITH CHECK (agency_id = auth.uid());
  END IF;
END $$;

-- ── 3. Offer templates table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offer_templates (
  id          TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
  agency_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  destination TEXT        NOT NULL DEFAULT '',
  nights      INTEGER     NOT NULL DEFAULT 7,
  includes    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offer_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'offer_templates' AND policyname = 'Users manage own templates'
  ) THEN
    CREATE POLICY "Users manage own templates"
      ON public.offer_templates FOR ALL
      USING (agency_id = auth.uid())
      WITH CHECK (agency_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_templates TO authenticated;

-- ── 4. Agency members table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agency_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email   TEXT        NOT NULL,
  display_name    TEXT,
  role            TEXT        NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'agent')),
  status          TEXT        NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'invited')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agency_members' AND policyname = 'Owner manages team'
  ) THEN
    CREATE POLICY "Owner manages team"
      ON public.agency_members FOR ALL
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'agency_members' AND policyname = 'Members read own membership'
  ) THEN
    CREATE POLICY "Members read own membership"
      ON public.agency_members FOR SELECT
      USING (member_user_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_members TO authenticated;

-- ── 5. Customer-facing SECURITY DEFINER functions ─────────────────────────────

CREATE OR REPLACE FUNCTION set_customer_favorites(p_offer_id TEXT, p_favorites JSONB)
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.offers
  SET customer_favorites = p_favorites
  WHERE id = p_offer_id;
$$;

CREATE OR REPLACE FUNCTION set_customer_note(p_offer_id TEXT, p_note TEXT)
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.offers
  SET customer_note = p_note
  WHERE id = p_offer_id;
$$;

GRANT EXECUTE ON FUNCTION set_customer_favorites(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_customer_note(TEXT, TEXT)       TO anon, authenticated;

-- ── 6. Additional GRANTs (run if not done in previous migrations) ─────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.offers TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.offers TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_profiles TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_views(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION select_offer_hotel(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_customer_response(TEXT, TEXT) TO anon, authenticated;
