-- Migration Proposal: 20261112000000_memberships_read_own.sql
-- Description: Allow authenticated users to read their own membership record without exposing other members' rows.
-- Note: This migration is READ-ONLY for review. DO NOT apply without user confirmation.

-- Security Reason:
-- Under deny-by-default RLS, authenticated users cannot query `public.memberships` to resolve
-- their own KKN role unless a SELECT policy exists for their UID.
-- Using `(select auth.uid()) = user_id` ensures strict tenant isolation at the row level:
-- a user can only read the row where user_id matches their own authenticated JWT UID.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'memberships' 
      AND policyname = 'memberships_read_own'
  ) THEN
    CREATE POLICY "memberships_read_own"
      ON public.memberships
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;
