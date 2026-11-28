-- ─────────────────────────────────────────────────────────────────────────────
--  V15 — remove leftover read policies on offers
--
--  After V14 anonymous access is blocked, but signed-in agencies could still
--  read other agencies' offers: the database has an extra SELECT policy that
--  is not in this repository (most likely created by hand in the dashboard).
--  Policies are OR-ed, so any permissive SELECT policy reopens the table.
--
--  This drops every SELECT policy on public.offers except
--  "Agency reads own and team offers". INSERT / UPDATE / DELETE policies are
--  not touched. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'offers'
      AND cmd        = 'SELECT'
      AND policyname <> 'Agency reads own and team offers'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.offers', p.policyname);
    RAISE NOTICE 'Dropped policy: %', p.policyname;
  END LOOP;
END $$;

-- Check: every policy left on offers. Expected:
--   Agency reads own and team offers  | SELECT
--   Auth users insert own offers      | INSERT
--   Users delete own offers           | DELETE
--   Users update own offers           | UPDATE
-- If you see a row with cmd = ALL, send it to Claude before changing anything.
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'offers'
ORDER BY cmd, policyname;
