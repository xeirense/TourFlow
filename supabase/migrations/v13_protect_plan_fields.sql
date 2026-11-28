-- ─────────────────────────────────────────────────────────────────────────────
--  V13 — protect plan / billing / admin fields on agency_profiles
--
--  Problem: the RLS policy lets every signed-in user UPDATE their own profile
--  row, including plan_tier, subscription_status, trial_ends_at, the monthly
--  counter and is_admin. Anyone could make themselves Enterprise or admin from
--  the browser console.
--
--  Fix: a trigger keeps those columns unchanged when the write comes directly
--  from a signed-in user (role "authenticated"). Server code (service_role key)
--  and SECURITY DEFINER functions (run as the table owner) can still change
--  them. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Check: should return one row
SELECT tgname FROM pg_trigger WHERE tgname = 'protect_agency_profile_fields';
