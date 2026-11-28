-- ─────────────────────────────────────────────────────────────────────────────
--  V11 — merge duplicate catalog hotels
--  "Titanic Mardan Palace" existed twice: city 'Antalya' (hotels_seed.sql) and
--  city 'Lara' (hotel_aliases.sql). Lara is a district of Antalya, so it is the
--  same hotel. Keep the 'Antalya' row, move aliases/usage/photos into it, and
--  delete the 'Lara' row. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  keep_id TEXT;
  drop_id TEXT;
BEGIN
  SELECT id INTO keep_id FROM public.hotels
   WHERE lower(name) = 'titanic mardan palace'
     AND lower(city) = 'antalya'
   LIMIT 1;

  SELECT id INTO drop_id FROM public.hotels
   WHERE lower(name) = 'titanic mardan palace'
     AND lower(city) = 'lara'
   LIMIT 1;

  IF keep_id IS NULL OR drop_id IS NULL THEN
    RAISE NOTICE 'Nothing to merge (keep=%, drop=%)', keep_id, drop_id;
    RETURN;
  END IF;

  UPDATE public.hotels k
     SET aliases     = ARRAY(SELECT DISTINCT unnest(k.aliases || d.aliases || ARRAY['Titanic Lara'])),
         chain       = COALESCE(k.chain, d.chain),
         photos      = ARRAY(SELECT DISTINCT unnest(k.photos || d.photos)),
         usage_count = k.usage_count + d.usage_count,
         verified    = true
    FROM public.hotels d
   WHERE k.id = keep_id AND d.id = drop_id;

  DELETE FROM public.hotels WHERE id = drop_id;

  RAISE NOTICE 'Merged hotel % into %', drop_id, keep_id;
END $$;

-- Check: should return exactly one row
SELECT id, name, city, chain, aliases, usage_count
  FROM public.hotels
 WHERE lower(name) = 'titanic mardan palace';
