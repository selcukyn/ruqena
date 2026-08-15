-- RUQENA Database Schema & RLS Hardening Migration
-- Sprint Bug Fixes: Challenge Deletion, Challenge Leave RPC, and RLS Policies
-- Migration Timestamp: 20260815160000

-- ==================================================
-- 1. CHALLENGE DELETION (OWNER ONLY)
-- ==================================================

-- Grant DELETE on challenges table to authenticated role
GRANT DELETE ON TABLE public.challenges TO authenticated;

-- Add RLS policy for challenge creator to delete their challenge
DROP POLICY IF EXISTS "Challenges DELETE policy" ON public.challenges;
CREATE POLICY "Challenges DELETE policy"
ON public.challenges FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- RPC: Atomic Delete Challenge (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.delete_challenge(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.challenges
        WHERE id = p_challenge_id AND creator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorized to delete this challenge';
    END IF;

    DELETE FROM public.challenges
    WHERE id = p_challenge_id AND creator_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_challenge(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_challenge(UUID) TO authenticated;

-- ==================================================
-- 2. CHALLENGE LEAVE RPC (MEMBER ONLY, CREATOR CANNOT LEAVE)
-- ==================================================

-- RPC: Leave Challenge (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.leave_challenge(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_creator_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    SELECT creator_id INTO v_creator_id
    FROM public.challenges
    WHERE id = p_challenge_id;

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    IF v_creator_id = auth.uid() THEN
        RAISE EXCEPTION 'Creator cannot leave challenge; delete the challenge instead';
    END IF;

    DELETE FROM public.challenge_members
    WHERE challenge_id = p_challenge_id AND user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.leave_challenge(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_challenge(UUID) TO authenticated;
