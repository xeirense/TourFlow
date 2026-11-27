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

-- Only service_role reads/writes cron_runs (no RLS needed; no authenticated access)
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
-- (safe to run multiple times — skips already-linked offers via client_id IS NULL check)
SELECT backfill_clients_from_offers();

-- ── 5. Create offer_sent activities for newly backfilled offers ───────────────
-- Idempotent: only inserts where no matching activity exists yet
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
