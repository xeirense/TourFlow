-- ─────────────────────────────────────────────────────────────────────────────
--  One-off cleanup: remove test data created while testing TourFlow
--  (test offers were already deleted from the dashboard).
--
--  Step 1: run only the SELECTs and check the rows are all test data.
--  Step 2: run the whole file. Deleting a client also deletes its
--          client_activities and reminders (ON DELETE CASCADE).
-- ─────────────────────────────────────────────────────────────────────────────

-- Preview: test clients
SELECT id, full_name, phone, created_at
  FROM public.clients
 WHERE id IN ('dc998d2898b5', 'ec5b9685d791', '5c5c1c83dbc7');

-- Preview: test hotels added by the learning loop (not seed hotels)
SELECT id, name, city, source, verified
  FROM public.hotels
 WHERE source <> 'seed'
   AND lower(name) IN ('zz test otel claude', 'test hotel antalya');

BEGIN;

DELETE FROM public.clients
 WHERE id IN ('dc998d2898b5', 'ec5b9685d791', '5c5c1c83dbc7');

DELETE FROM public.hotels
 WHERE source <> 'seed'
   AND lower(name) IN ('zz test otel claude', 'test hotel antalya');

COMMIT;

-- Check: both should return 0
SELECT count(*) AS test_clients_left FROM public.clients
 WHERE id IN ('dc998d2898b5', 'ec5b9685d791', '5c5c1c83dbc7');
SELECT count(*) AS test_hotels_left FROM public.hotels
 WHERE lower(name) IN ('zz test otel claude', 'test hotel antalya');
