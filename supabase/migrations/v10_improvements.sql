-- ============================================================
--  V10 MIGRATION – Hotel/CRM/Notification Improvements
--  Run AFTER V9 migration. All statements are idempotent.
-- ============================================================

-- ── 1. Phone normalization SQL function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION normalize_phone_az(p TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE digits TEXT;
BEGIN
  IF p IS NULL OR trim(p) = '' THEN RETURN ''; END IF;
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  IF length(digits) = 12 AND left(digits, 3) = '994' THEN
    RETURN '+' || digits;
  END IF;
  IF length(digits) = 10 AND left(digits, 1) = '0' THEN
    RETURN '+994' || right(digits, 9);
  END IF;
  IF length(digits) = 9 THEN
    RETURN '+994' || digits;
  END IF;
  RETURN trim(p);
END;
$$;

-- ── 2. Add aliases and chain columns to hotels ───────────────────────────────
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS aliases TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chain   TEXT;

-- ── 3. Hotel search V10 — ranks: exact name > alias > chain > fuzzy ──────────
CREATE OR REPLACE FUNCTION search_hotels_v10(
  query_text   TEXT,
  result_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id TEXT, name TEXT, city TEXT, country TEXT, stars INTEGER,
  default_meal TEXT, description_az TEXT, photos TEXT[],
  verified BOOLEAN, usage_count INTEGER, chain TEXT, aliases TEXT[]
)
SECURITY INVOKER LANGUAGE plpgsql AS $$
DECLARE norm_q TEXT;
BEGIN
  norm_q := lower(translate(query_text, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu'));
  RETURN QUERY
  WITH scored AS (
    SELECT
      h.id, h.name, h.city, h.country, h.stars,
      h.default_meal, h.description_az, h.photos,
      h.verified, h.usage_count, h.chain, h.aliases,
      CASE
        WHEN h.normalized_name = norm_q THEN 4
        WHEN h.normalized_name % norm_q OR h.normalized_name ILIKE '%' || norm_q || '%' THEN 3
        WHEN EXISTS (
          SELECT 1 FROM unnest(h.aliases) AS a
          WHERE lower(translate(a, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) % norm_q
             OR lower(translate(a, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) ILIKE '%' || norm_q || '%'
        ) THEN 2
        WHEN lower(translate(COALESCE(h.chain, ''), 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) ILIKE '%' || norm_q || '%'
          OR lower(translate(COALESCE(h.chain, ''), 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) % norm_q THEN 1
        ELSE 0
      END AS rank_score,
      similarity(h.normalized_name, norm_q) AS sim_score
    FROM public.hotels h
    WHERE (h.verified = true OR h.agency_id = auth.uid() OR h.created_by = auth.uid())
      AND length(trim(norm_q)) >= 2
      AND (
        h.normalized_name % norm_q
        OR h.normalized_name ILIKE '%' || norm_q || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(h.aliases) AS a
          WHERE lower(translate(a, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) % norm_q
             OR lower(translate(a, 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) ILIKE '%' || norm_q || '%'
        )
        OR lower(translate(COALESCE(h.chain, ''), 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) ILIKE '%' || norm_q || '%'
        OR lower(translate(COALESCE(h.chain, ''), 'əƏıİşŞçÇğĞöÖüÜ', 'eeiissccggoouu')) % norm_q
      )
  )
  SELECT s.id, s.name, s.city, s.country, s.stars,
         s.default_meal, s.description_az, s.photos,
         s.verified, s.usage_count, s.chain, s.aliases
  FROM scored s
  ORDER BY s.rank_score DESC, s.sim_score DESC, s.usage_count DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_hotels_v10(TEXT, INTEGER) TO authenticated;

-- ── 4. Add do_not_contact flag to clients ────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT false;

-- ── 5. Add normalized_phone generated column to clients ──────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT
  GENERATED ALWAYS AS (normalize_phone_az(phone)) STORED;

-- ── 6. Find duplicate clients (run SELECT to inspect before merging) ──────────
-- To view duplicates before migration, run:
--   SELECT agency_owner_id, normalized_phone, COUNT(*), array_agg(id ORDER BY created_at)
--   FROM clients
--   WHERE normalized_phone IS NOT NULL AND normalized_phone != ''
--   GROUP BY agency_owner_id, normalized_phone
--   HAVING COUNT(*) > 1;

-- ── 7. Merge duplicate clients (keep oldest, move related records) ────────────
DO $$
DECLARE
  r       RECORD;
  keep_id TEXT;
  dup_ids TEXT[];
BEGIN
  FOR r IN
    SELECT agency_owner_id, normalized_phone,
           array_agg(id ORDER BY created_at) AS ids
    FROM public.clients
    WHERE normalized_phone IS NOT NULL AND normalized_phone != ''
    GROUP BY agency_owner_id, normalized_phone
    HAVING COUNT(*) > 1
  LOOP
    keep_id := r.ids[1];
    dup_ids := r.ids[2:array_length(r.ids, 1)];

    UPDATE public.offers          SET client_id = keep_id WHERE client_id = ANY(dup_ids);
    UPDATE public.client_activities SET client_id = keep_id WHERE client_id = ANY(dup_ids);
    UPDATE public.reminders       SET client_id = keep_id WHERE client_id = ANY(dup_ids);
    DELETE FROM public.clients    WHERE id = ANY(dup_ids);

    RAISE NOTICE 'Merged % duplicate(s) into client %', array_length(dup_ids, 1), keep_id;
  END LOOP;
END;
$$;

-- ── 8. Unique index on (agency_owner_id, normalized_phone) ───────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_agency_phone
  ON public.clients (agency_owner_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone != '';

-- ── 9. Add dedupe_key to reminders (prevents duplicate active reminders) ──────
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Partial unique index: one active reminder per manager+dedupe_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_active_dedupe
  ON public.reminders (manager_id, dedupe_key)
  WHERE done_at IS NULL AND dedupe_key IS NOT NULL;

-- ── 10. Backfill dedupe_key for existing auto-created reminders ───────────────
-- (kind already contains the entity ID, e.g. "offer_no_view:abc123")
UPDATE public.reminders
SET dedupe_key = kind
WHERE kind != 'manual' AND dedupe_key IS NULL;

-- ── 11. notification_settings column on agency_profiles ──────────────────────
ALTER TABLE public.agency_profiles
  ADD COLUMN IF NOT EXISTS notification_settings JSONB NOT NULL DEFAULT
    '{"quietStart":22,"quietEnd":9,"highEnabled":true,"normalEnabled":true,"lowEnabled":true}'::jsonb;

-- ── 12. notification_log table (rate-limiting repeat notifications) ───────────
CREATE TABLE IF NOT EXISTS public.notification_log (
  id            BIGSERIAL   PRIMARY KEY,
  manager_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id      TEXT,
  kind          TEXT        NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pending_count INTEGER     NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_log_dedup
  ON public.notification_log (manager_id, COALESCE(offer_id, ''), kind);

CREATE INDEX IF NOT EXISTS idx_notif_log_lookup
  ON public.notification_log (manager_id, kind, sent_at);

GRANT SELECT, INSERT, UPDATE ON public.notification_log TO service_role;
