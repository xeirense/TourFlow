-- ============================================================
--  Hotel Aliases & Chain seed (V10)
--  Idempotent — safe to re-run AFTER v10_improvements.sql.
-- ============================================================

-- ── Rixos ─────────────────────────────────────────────────────────────────────
UPDATE public.hotels SET chain = 'Rixos'
  WHERE lower(name) LIKE '%rixos%' AND (chain IS NULL OR chain = '');

UPDATE public.hotels SET aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Sungate','Rixos Sungate','Sungate Port Royal','Rixos Kemer']))
  WHERE lower(name) LIKE '%rixos%' AND lower(name) LIKE '%sungate%';

UPDATE public.hotels SET aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Rixos Belek','Rixos Premium']))
  WHERE lower(name) LIKE '%rixos%' AND lower(name) LIKE '%belek%';

UPDATE public.hotels SET aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Rixos Downtown','Rixos Antalya']))
  WHERE lower(name) LIKE '%rixos%' AND lower(name) LIKE '%downtown%';

-- ── Delphin ───────────────────────────────────────────────────────────────────
UPDATE public.hotels SET chain = 'Delphin'
  WHERE lower(name) LIKE '%delphin%' AND (chain IS NULL OR chain = '');

UPDATE public.hotels SET aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Delphin Imperial','Delphin Lara']))
  WHERE lower(name) LIKE '%delphin%' AND lower(name) LIKE '%imperial%';

-- ── Titanic ───────────────────────────────────────────────────────────────────
UPDATE public.hotels SET chain = 'Titanic'
  WHERE lower(name) LIKE '%titanic%' AND (chain IS NULL OR chain = '');

UPDATE public.hotels SET aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['titanik','Titanic Hotel','Mardan Palace']))
  WHERE lower(name) LIKE '%titanic%' AND lower(name) LIKE '%mardan%';

UPDATE public.hotels SET aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['titanik','Titanic Lara']))
  WHERE lower(name) LIKE '%titanic%' AND lower(name) LIKE '%lara%';

-- ── Regnum ────────────────────────────────────────────────────────────────────
UPDATE public.hotels SET chain='Regnum',
  aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Regnum Carya','Regnum Golf']))
  WHERE lower(name) LIKE '%regnum%' AND (chain IS NULL OR chain='');

-- ── Susesi ────────────────────────────────────────────────────────────────────
UPDATE public.hotels SET chain='Susesi',
  aliases = ARRAY(SELECT DISTINCT unnest(aliases || ARRAY['Susesi Luxury','Susesi Belek']))
  WHERE lower(name) LIKE '%susesi%' AND (chain IS NULL OR chain='');

-- ── Hilton, Sheraton, Marriott ────────────────────────────────────────────────
UPDATE public.hotels SET chain='Hilton'   WHERE lower(name) LIKE '%hilton%'   AND (chain IS NULL OR chain='');
UPDATE public.hotels SET chain='Sheraton' WHERE lower(name) LIKE '%sheraton%' AND (chain IS NULL OR chain='');
UPDATE public.hotels SET chain='Marriott' WHERE lower(name) LIKE '%marriott%' AND (chain IS NULL OR chain='');

-- ── Upsert key test hotels ────────────────────────────────────────────────────
INSERT INTO public.hotels (name,city,country,stars,default_meal,source,verified,chain,aliases)
VALUES ('Rixos Sungate Port Royal','Kemer','Türkiyə',5,'UAI','seed',true,'Rixos',ARRAY['Sungate','Rixos Sungate','Sungate Port Royal','Rixos Kemer'])
ON CONFLICT (normalized_name, lower(city)) DO UPDATE SET
  chain=EXCLUDED.chain, verified=true,
  aliases=ARRAY(SELECT DISTINCT unnest(public.hotels.aliases || EXCLUDED.aliases));

INSERT INTO public.hotels (name,city,country,stars,default_meal,source,verified,chain,aliases)
VALUES ('Rixos Premium Belek','Belek','Türkiyə',5,'UAI','seed',true,'Rixos',ARRAY['Rixos Belek','Rixos Premium'])
ON CONFLICT (normalized_name, lower(city)) DO UPDATE SET
  chain=EXCLUDED.chain, verified=true,
  aliases=ARRAY(SELECT DISTINCT unnest(public.hotels.aliases || EXCLUDED.aliases));

INSERT INTO public.hotels (name,city,country,stars,default_meal,source,verified,chain,aliases)
VALUES ('Delphin Imperial Hotel','Lara','Türkiyə',5,'UAI','seed',true,'Delphin',ARRAY['Delphin Imperial','Delphin Lara'])
ON CONFLICT (normalized_name, lower(city)) DO UPDATE SET
  chain=EXCLUDED.chain, verified=true,
  aliases=ARRAY(SELECT DISTINCT unnest(public.hotels.aliases || EXCLUDED.aliases));

INSERT INTO public.hotels (name,city,country,stars,default_meal,source,verified,chain,aliases)
VALUES ('Titanic Mardan Palace','Lara','Türkiyə',5,'UAI','seed',true,'Titanic',ARRAY['titanik','Titanic Hotel','Mardan Palace','Titanic Lara'])
ON CONFLICT (normalized_name, lower(city)) DO UPDATE SET
  chain=EXCLUDED.chain, verified=true,
  aliases=ARRAY(SELECT DISTINCT unnest(public.hotels.aliases || EXCLUDED.aliases));
