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

-- Read access: see V14 at the end of this file ("Agency reads own and team
-- offers"). The public offer page loads offers with the service key, so no
-- public SELECT policy is needed.

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

-- ============================================================
--  V6 MIGRATION – CRM: clients, activities, reminders
--  Run this in Supabase SQL Editor (all safe with IF NOT EXISTS)
-- ============================================================

-- ── 1. clients ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                     TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
  agency_owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_manager_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name              TEXT        NOT NULL,
  phone                  TEXT        NOT NULL DEFAULT '',
  email                  TEXT,
  birthday               DATE,
  notes                  TEXT,
  tags                   TEXT[]      NOT NULL DEFAULT '{}',
  budget_min             NUMERIC,
  budget_max             NUMERIC,
  currency               TEXT        NOT NULL DEFAULT 'AZN',
  travelers              JSONB       NOT NULL DEFAULT '{"adults":2,"children":0,"child_ages":[]}'::jsonb,
  preferred_destinations TEXT[]      NOT NULL DEFAULT '{}',
  preferred_stars        INTEGER,
  preferred_meal         TEXT,
  source                 TEXT        NOT NULL DEFAULT 'whatsapp'
                           CHECK (source IN ('whatsapp','instagram','referral','walk-in','other')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Agency owner can do everything with their clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clients' AND policyname='Owner manages agency clients') THEN
    CREATE POLICY "Owner manages agency clients" ON public.clients
      FOR ALL USING (agency_owner_id = auth.uid()) WITH CHECK (agency_owner_id = auth.uid());
  END IF;
END $$;

-- Assigned manager can SELECT their clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clients' AND policyname='Manager reads assigned clients') THEN
    CREATE POLICY "Manager reads assigned clients" ON public.clients
      FOR SELECT USING (assigned_manager_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated, service_role;

-- ── 2. offers.client_id FK ────────────────────────────────────────────────────
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL;

-- ── 3. client_activities ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_activities (
  id         TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
  client_id  TEXT        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL
               CHECK (type IN ('offer_sent','viewed','responded','selected','note','call','paid','trip_done')),
  payload    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_activities' AND policyname='Agency manages client activities') THEN
    CREATE POLICY "Agency manages client activities" ON public.client_activities
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = client_id
            AND (c.agency_owner_id = auth.uid() OR c.assigned_manager_id = auth.uid())
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_activities TO authenticated, service_role;

-- ── 4. reminders ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders (
  id         TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
  client_id  TEXT        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  manager_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_at     TIMESTAMPTZ NOT NULL,
  kind       TEXT        NOT NULL DEFAULT 'manual',
  text       TEXT        NOT NULL,
  done_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reminders' AND policyname='Agency manages reminders') THEN
    CREATE POLICY "Agency manages reminders" ON public.reminders
      FOR ALL USING (
        manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id = client_id AND c.agency_owner_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated, service_role;

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS clients_agency_owner_idx    ON public.clients (agency_owner_id);
CREATE INDEX IF NOT EXISTS clients_manager_idx         ON public.clients (assigned_manager_id);
CREATE INDEX IF NOT EXISTS activities_client_idx       ON public.client_activities (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reminders_manager_due_idx   ON public.reminders (manager_id, due_at) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS reminders_client_idx        ON public.reminders (client_id);
CREATE INDEX IF NOT EXISTS offers_client_id_idx        ON public.offers (client_id);

-- ── 6. Backfill helper (call manually: SELECT backfill_clients_from_offers();) ─
CREATE OR REPLACE FUNCTION backfill_clients_from_offers()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
  v_row   RECORD;
  v_cid   TEXT;
BEGIN
  FOR v_row IN
    SELECT DISTINCT ON (agency_id, COALESCE(client_phone, client_name))
      id, agency_id, client_name, client_phone
    FROM public.offers
    WHERE agency_id IS NOT NULL
      AND client_id IS NULL
    ORDER BY agency_id, COALESCE(client_phone, client_name), created_at
  LOOP
    -- Insert client (ignore conflicts on duplicate name+agency)
    INSERT INTO public.clients (agency_owner_id, full_name, phone)
    VALUES (v_row.agency_id, v_row.client_name, COALESCE(v_row.client_phone, ''))
    RETURNING id INTO v_cid;

    -- Link all matching offers for this agency+phone or name
    UPDATE public.offers
    SET client_id = v_cid
    WHERE agency_id = v_row.agency_id
      AND COALESCE(client_phone, client_name) = COALESCE(v_row.client_phone, v_row.client_name)
      AND client_id IS NULL;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION backfill_clients_from_offers() TO service_role;

-- ============================================================
--  V7 MIGRATION – Hotel Catalog with fuzzy search
--  Run this in Supabase SQL Editor (all safe with IF NOT EXISTS)
-- ============================================================

-- ── 0. Enable pg_trgm ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. is_admin flag on agency_profiles ──────────────────────────────────────
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ── 2. hotels table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hotels (
  id              TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(6), 'hex'),
  name            TEXT        NOT NULL,
  normalized_name TEXT        GENERATED ALWAYS AS (
    lower(translate(name, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu'))
  ) STORED,
  city            TEXT        NOT NULL DEFAULT '',
  country         TEXT        NOT NULL DEFAULT '',
  stars           INTEGER     NOT NULL DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  description_az  TEXT,
  default_meal    TEXT        NOT NULL DEFAULT 'AI',
  photos          TEXT[]      NOT NULL DEFAULT '{}',
  lat             NUMERIC,
  lng             NUMERIC,
  source          TEXT        NOT NULL DEFAULT 'agency'
                    CHECK (source IN ('seed','agency','admin')),
  verified        BOOLEAN     NOT NULL DEFAULT false,
  usage_count     INTEGER     NOT NULL DEFAULT 0,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  agency_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can read verified hotels + their own agency hotels
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotels' AND policyname='Read hotels') THEN
    CREATE POLICY "Read hotels" ON public.hotels
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
          verified = true OR agency_id = auth.uid() OR created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS: authenticated can insert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotels' AND policyname='Insert hotel') THEN
    CREATE POLICY "Insert hotel" ON public.hotels
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- RLS: admins can update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotels' AND policyname='Admin update hotel') THEN
    CREATE POLICY "Admin update hotel" ON public.hotels
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.agency_profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- RLS: admins can delete
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hotels' AND policyname='Admin delete hotel') THEN
    CREATE POLICY "Admin delete hotel" ON public.hotels
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.agency_profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotels TO authenticated, service_role;

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS hotels_name_city_uniq
  ON public.hotels (normalized_name, lower(city));

CREATE INDEX IF NOT EXISTS hotels_trgm_idx
  ON public.hotels USING GIN (normalized_name gin_trgm_ops);

-- ── 4. Fuzzy search RPC ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_hotels_v7(query_text TEXT, result_limit INTEGER DEFAULT 8)
RETURNS TABLE (
  id TEXT, name TEXT, city TEXT, country TEXT, stars INTEGER,
  default_meal TEXT, description_az TEXT, photos TEXT[],
  verified BOOLEAN, usage_count INTEGER
)
SECURITY INVOKER LANGUAGE plpgsql AS $$
DECLARE
  norm_q TEXT;
BEGIN
  norm_q := lower(translate(query_text, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu'));
  RETURN QUERY
  SELECT h.id, h.name, h.city, h.country, h.stars,
         h.default_meal, h.description_az, h.photos,
         h.verified, h.usage_count
  FROM public.hotels h
  WHERE (h.verified = true OR h.agency_id = auth.uid() OR h.created_by = auth.uid())
    AND length(trim(norm_q)) >= 2
    AND (h.normalized_name % norm_q OR h.normalized_name ILIKE '%' || norm_q || '%')
  ORDER BY similarity(h.normalized_name, norm_q) DESC, h.usage_count DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_hotels_v7(TEXT, INTEGER) TO authenticated;

-- ── 5. track_hotel_usage — SECURITY DEFINER (bypasses RLS for increment/insert) ─
CREATE OR REPLACE FUNCTION track_hotel_usage(
  p_catalog_id  TEXT    DEFAULT NULL,
  p_name        TEXT    DEFAULT NULL,
  p_city        TEXT    DEFAULT NULL,
  p_country     TEXT    DEFAULT NULL,
  p_stars       INTEGER DEFAULT 5,
  p_meal        TEXT    DEFAULT 'AI',
  p_agency_id   UUID    DEFAULT NULL,
  p_photo_url   TEXT    DEFAULT NULL
) RETURNS VOID SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  IF p_catalog_id IS NOT NULL THEN
    UPDATE public.hotels SET usage_count = usage_count + 1 WHERE id = p_catalog_id;
    IF p_photo_url IS NOT NULL AND p_photo_url <> '' THEN
      UPDATE public.hotels
        SET photos = array_append(photos, p_photo_url)
        WHERE id = p_catalog_id AND NOT (photos @> ARRAY[p_photo_url]);
    END IF;
  ELSIF p_name IS NOT NULL AND trim(p_name) <> '' AND p_agency_id IS NOT NULL THEN
    INSERT INTO public.hotels (name, city, country, stars, default_meal, source, verified, agency_id, created_by, photos)
    VALUES (
      trim(p_name), COALESCE(trim(p_city),''), COALESCE(trim(p_country),''),
      COALESCE(p_stars,5), COALESCE(p_meal,'AI'),
      'agency', false, p_agency_id, p_agency_id,
      CASE WHEN p_photo_url IS NOT NULL AND p_photo_url <> ''
           THEN ARRAY[p_photo_url] ELSE '{}'::TEXT[] END
    )
    ON CONFLICT (normalized_name, lower(city)) DO UPDATE
      SET usage_count = public.hotels.usage_count + 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION track_hotel_usage(TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,UUID,TEXT) TO authenticated;

-- ============================================================
--  V8 MIGRATION – Bug fixes and verifiability
--  Run AFTER V7 migration.  All statements are idempotent.
-- ============================================================

-- ── 1. Add missing client_phone column to offers ─────────────────────────────
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS client_phone TEXT;

-- ── 2. cron_runs table for verifiability ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_runs (
  id            BIGSERIAL   PRIMARY KEY,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  created_count INTEGER     NOT NULL DEFAULT 0,
  sent_count    INTEGER     NOT NULL DEFAULT 0,
  agency_filter TEXT,
  error         TEXT
);

GRANT SELECT, INSERT, UPDATE ON public.cron_runs TO service_role;

-- ── 3. Fix track_hotel_usage — new agency hotels start at usage_count=1 ──────
CREATE OR REPLACE FUNCTION track_hotel_usage(
  p_catalog_id  TEXT    DEFAULT NULL,
  p_name        TEXT    DEFAULT NULL,
  p_city        TEXT    DEFAULT NULL,
  p_country     TEXT    DEFAULT NULL,
  p_stars       INTEGER DEFAULT 5,
  p_meal        TEXT    DEFAULT 'AI',
  p_agency_id   UUID    DEFAULT NULL,
  p_photo_url   TEXT    DEFAULT NULL
) RETURNS VOID SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  IF p_catalog_id IS NOT NULL THEN
    UPDATE public.hotels SET usage_count = usage_count + 1 WHERE id = p_catalog_id;
    IF p_photo_url IS NOT NULL AND p_photo_url <> '' THEN
      UPDATE public.hotels
        SET photos = array_append(photos, p_photo_url)
        WHERE id = p_catalog_id AND NOT (photos @> ARRAY[p_photo_url]);
    END IF;
  ELSIF p_name IS NOT NULL AND trim(p_name) <> '' AND p_agency_id IS NOT NULL THEN
    INSERT INTO public.hotels
      (name, city, country, stars, default_meal, source, verified, agency_id, created_by, photos, usage_count)
    VALUES (
      trim(p_name), COALESCE(trim(p_city),''), COALESCE(trim(p_country),''),
      COALESCE(p_stars,5), COALESCE(p_meal,'AI'),
      'agency', false, p_agency_id, p_agency_id,
      CASE WHEN p_photo_url IS NOT NULL AND p_photo_url <> ''
           THEN ARRAY[p_photo_url] ELSE '{}'::TEXT[] END,
      1
    )
    ON CONFLICT (normalized_name, lower(city)) DO UPDATE
      SET usage_count = public.hotels.usage_count + 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION track_hotel_usage(TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,UUID,TEXT) TO authenticated;

-- ── 4. Backfill clients from existing offers ──────────────────────────────────
SELECT backfill_clients_from_offers();

-- ── 5. Create offer_sent activities for newly backfilled offers ───────────────
INSERT INTO public.client_activities (client_id, type, payload)
SELECT
  o.client_id,
  'offer_sent',
  jsonb_build_object('offer_id', o.id, 'destination', o.destination, 'backfilled', true)
FROM public.offers o
WHERE o.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.client_activities ca
    WHERE ca.client_id = o.client_id
      AND ca.type = 'offer_sent'
      AND (ca.payload->>'offer_id') = o.id::text
  );

-- ============================================================
--  V9 MIGRATION – Telegram Integration
--  Run AFTER V8 migration.  All statements are idempotent.
-- ============================================================

-- ── 1. Add telegram_chat_id column to agency_profiles ────────────────────────
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- ── 2. telegram_connect_tokens — one-time 15-min link tokens ─────────────────
CREATE TABLE IF NOT EXISTS public.telegram_connect_tokens (
  token       TEXT        PRIMARY KEY,
  agency_id   UUID        NOT NULL REFERENCES public.agency_profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

GRANT SELECT, INSERT, DELETE ON public.telegram_connect_tokens TO service_role;

CREATE INDEX IF NOT EXISTS idx_telegram_tokens_agency
  ON public.telegram_connect_tokens (agency_id);

CREATE INDEX IF NOT EXISTS idx_telegram_tokens_expires
  ON public.telegram_connect_tokens (expires_at);

-- ── V12: storage bucket for uploaded images ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hotel-images',
  'hotel-images',
  true,
  5242880,                                            -- 5 MB, same as the API limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── V13: protect plan / billing / admin fields ────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_agency_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.plan_tier           := 'growth';
      NEW.subscription_status := 'trialing';
      NEW.trial_ends_at       := NOW() + INTERVAL '14 days';
      NEW.monthly_offers_used := 0;
      NEW.monthly_reset_at    := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
      NEW.is_admin            := false;
    ELSE
      NEW.plan_tier           := OLD.plan_tier;
      NEW.subscription_status := OLD.subscription_status;
      NEW.trial_ends_at       := OLD.trial_ends_at;
      NEW.monthly_offers_used := OLD.monthly_offers_used;
      NEW.monthly_reset_at    := OLD.monthly_reset_at;
      NEW.is_admin            := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_agency_profile_fields ON public.agency_profiles;
CREATE TRIGGER protect_agency_profile_fields
  BEFORE INSERT OR UPDATE ON public.agency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_agency_profile_fields();

-- ── V14: offers readable only by their agency (no public read) ───────────────
DROP POLICY IF EXISTS "Public read offers" ON public.offers;

DROP POLICY IF EXISTS "Agency reads own and team offers" ON public.offers;
CREATE POLICY "Agency reads own and team offers"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (
    agency_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.agency_members m
      WHERE m.owner_id       = auth.uid()
        AND m.member_user_id = offers.agency_id
        AND m.status         = 'active'
    )
  );

-- Anonymous visitors get no direct table access at all
REVOKE SELECT ON public.offers FROM anon;
