-- ─────────────────────────────────────────────────────────────────────────────
--  V14 — offers are no longer readable by everyone
--
--  Problem: policy "Public read offers" (USING true) let anyone with the public
--  API key list EVERY agency's offers — customer names, phone numbers, notes.
--  The public offer page does not need it: it loads the offer on the server
--  with the service key (lib/supabase.ts → getOffer), and customer actions go
--  through SECURITY DEFINER functions / server routes.
--
--  New rule: a signed-in user reads an offer if they created it, or if it was
--  created by an active member of their team (agency owner sees the team).
--  Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Check: should list the new policy and no "Public read offers"
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'offers' ORDER BY policyname;
