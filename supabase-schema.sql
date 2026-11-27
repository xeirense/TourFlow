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

-- ============================================================
--  V4 MIGRATION – Plan / Subscription / Gating
--  Run this in Supabase SQL Editor (all safe with IF NOT EXISTS)
-- ============================================================

-- ── 1. Plan & subscription columns on agency_profiles ─────────────────────────
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS plan_tier            TEXT NOT NULL DEFAULT 'growth'
    CHECK (plan_tier IN ('starter', 'growth', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status  TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS trial_ends_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS monthly_offers_used  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_reset_at     TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

-- ── 2. Auto-create agency_profile on new user signup ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.agency_profiles (
    id, plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at
  ) VALUES (
    NEW.id,
    'growth',
    'trialing',
    NOW() + INTERVAL '14 days',
    0,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if present, then re-create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. Backfill missing profiles for existing users ──────────────────────────
INSERT INTO public.agency_profiles (
  id, plan_tier, subscription_status, trial_ends_at, monthly_offers_used, monthly_reset_at
)
SELECT
  id,
  'growth',
  'trialing',
  NOW() + INTERVAL '14 days',
  0,
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── 4. Atomic offer-limit check + increment ────────────────────────────────────
-- Returns: { "allowed": true } or { "allowed": false, "used": N, "limit": 50 }
-- Automatically resets the monthly counter when the reset date has passed.
CREATE OR REPLACE FUNCTION check_offer_limit(p_agency_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile         RECORD;
  v_effective_plan  TEXT;
BEGIN
  SELECT plan_tier, subscription_status, trial_ends_at,
         monthly_offers_used, monthly_reset_at
  INTO   v_profile
  FROM   public.agency_profiles
  WHERE  id = p_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true); -- no profile yet → allow
  END IF;

  -- Effective plan resolution
  v_effective_plan := v_profile.plan_tier;
  IF v_profile.subscription_status = 'trialing' THEN
    IF v_profile.trial_ends_at IS NULL OR v_profile.trial_ends_at <= NOW() THEN
      v_effective_plan := 'starter';           -- trial expired
    END IF;
  ELSIF v_profile.subscription_status = 'canceled' THEN
    v_effective_plan := 'starter';
  END IF;

  -- Only starter has a monthly cap
  IF v_effective_plan != 'starter' THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Reset monthly counter if reset date has passed
  IF v_profile.monthly_reset_at IS NULL OR v_profile.monthly_reset_at <= NOW() THEN
    UPDATE public.agency_profiles
    SET    monthly_offers_used = 0,
           monthly_reset_at   = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    WHERE  id = p_agency_id
    RETURNING monthly_offers_used INTO v_profile.monthly_offers_used;
  END IF;

  IF v_profile.monthly_offers_used >= 50 THEN
    RETURN jsonb_build_object('allowed', false,
                              'used',  v_profile.monthly_offers_used,
                              'limit', 50);
  END IF;

  -- Increment and allow
  UPDATE public.agency_profiles
  SET    monthly_offers_used = monthly_offers_used + 1
  WHERE  id = p_agency_id;

  RETURN jsonb_build_object('allowed', true,
                             'used',  v_profile.monthly_offers_used + 1,
                             'limit', 50);
END;
$$;

GRANT EXECUTE ON FUNCTION check_offer_limit(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION handle_new_user()         TO service_role;

-- ============================================================
--  V5 MIGRATION – Manager name on agency_profiles
--  Run this in Supabase SQL Editor (safe with IF NOT EXISTS)
-- ============================================================

ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS manager_name TEXT DEFAULT NULL;
