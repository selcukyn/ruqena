-- RUQENA Database Schema & RLS Hardening Migration
-- Sprint 1A: Internal RLS Schema Isolation & Privilege Hardening (Dependency-Safe Fix)
-- Migration Timestamp: 20260814130000

-- ==================================================
-- 1. CREATE ISOLATED INTERNAL SCHEMA
-- ==================================================
CREATE SCHEMA IF NOT EXISTS internal;

-- Minimum schema usage for authenticated role so PostgreSQL RLS engine can resolve function calls
GRANT USAGE ON SCHEMA internal TO authenticated;

-- Prevent client roles and PUBLIC from creating objects in internal schema
REVOKE CREATE ON SCHEMA internal FROM PUBLIC, authenticated;
REVOKE USAGE ON SCHEMA internal FROM PUBLIC;

-- ==================================================
-- 2. SECURITY DEFINER HELPERS IN INTERNAL SCHEMA (CALLER-BOUND)
-- ==================================================

-- Helper 1: Check if calling user (auth.uid()) is creator of a challenge
CREATE OR REPLACE FUNCTION internal.is_challenge_creator(p_challenge_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.challenges
        WHERE id = p_challenge_id
          AND creator_id = auth.uid()
    );
$$;

-- Helper 2: Check if calling user (auth.uid()) is a member of a challenge
CREATE OR REPLACE FUNCTION internal.is_challenge_member(p_challenge_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.challenge_members
        WHERE challenge_id = p_challenge_id
          AND user_id = auth.uid()
    );
$$;

-- Grant EXECUTE privileges ONLY to authenticated role for RLS policy evaluation
GRANT EXECUTE ON FUNCTION internal.is_challenge_creator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION internal.is_challenge_member(UUID) TO authenticated;

-- Revoke EXECUTE privileges from PUBLIC
REVOKE EXECUTE ON FUNCTION internal.is_challenge_creator(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION internal.is_challenge_member(UUID) FROM PUBLIC;

-- ==================================================
-- 3. REFACTOR EXISTING RPCs TO BE SELF-CONTAINED (REMOVE LEGACY PUBLIC HELPER DEPENDENCIES)
-- ==================================================

-- RPC 1: Send Friend Request
CREATE OR REPLACE FUNCTION public.send_friend_request(p_receiver_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    IF auth.uid() = p_receiver_id THEN
        RAISE EXCEPTION 'Cannot send friend request to self';
    END IF;

    -- Inline friend check (no dependency on legacy public.are_friends)
    IF EXISTS (
        SELECT 1 FROM public.friends
        WHERE user_id = auth.uid() AND friend_id = p_receiver_id
    ) THEN
        RAISE EXCEPTION 'Users are already friends';
    END IF;

    -- Inline pending request check (no dependency on legacy public.has_existing_friend_request)
    IF EXISTS (
        SELECT 1 FROM public.friend_requests
        WHERE ((sender_id = auth.uid() AND receiver_id = p_receiver_id)
            OR (sender_id = p_receiver_id AND receiver_id = auth.uid()))
          AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'A pending friend request already exists between these users';
    END IF;

    BEGIN
        INSERT INTO public.friend_requests (sender_id, receiver_id, status)
        VALUES (auth.uid(), p_receiver_id, 'pending')
        RETURNING id INTO v_new_id;
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'A pending friend request already exists between these users';
    END;

    RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_friend_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;

-- RPC 2: Respond to Friend Request
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(
    p_request_id UUID,
    p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sender_id UUID;
    v_receiver_id UUID;
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    IF p_status NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status response';
    END IF;

    SELECT sender_id, receiver_id, status
    INTO v_sender_id, v_receiver_id, v_status
    FROM public.friend_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Friend request not found';
    END IF;

    IF v_receiver_id <> auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to respond to this friend request';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Friend request is no longer pending';
    END IF;

    UPDATE public.friend_requests
    SET status = p_status
    WHERE id = p_request_id;

    IF p_status = 'accepted' THEN
        INSERT INTO public.friends (user_id, friend_id)
        VALUES (v_sender_id, v_receiver_id)
        ON CONFLICT (user_id, friend_id) DO NOTHING;

        INSERT INTO public.friends (user_id, friend_id)
        VALUES (v_receiver_id, v_sender_id)
        ON CONFLICT (user_id, friend_id) DO NOTHING;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_to_friend_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_friend_request(UUID, TEXT) TO authenticated;

-- RPC 3: Join Challenge
CREATE OR REPLACE FUNCTION public.join_challenge(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_creator_id UUID;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    SELECT creator_id, start_date, end_date
    INTO v_creator_id, v_start_date, v_end_date
    FROM public.challenges
    WHERE id = p_challenge_id;

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    IF CURRENT_DATE < v_start_date OR CURRENT_DATE > v_end_date THEN
        RAISE EXCEPTION 'Challenge is not currently active';
    END IF;

    -- Inline friend check (no dependency on legacy public.are_friends)
    IF v_creator_id <> auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.friends
        WHERE user_id = auth.uid() AND friend_id = v_creator_id
    ) THEN
        RAISE EXCEPTION 'Not authorized to join this challenge';
    END IF;

    INSERT INTO public.challenge_members (challenge_id, user_id, progress)
    VALUES (p_challenge_id, auth.uid(), 0)
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_challenge(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_challenge(UUID) TO authenticated;

-- ==================================================
-- 4. HARDENED RLS POLICIES (REPLACING ALL LEGACY HELPER DEPENDENCIES)
-- ==================================================

-- A. WORKOUTS (Direct Non-Recursive EXISTS Query)
DROP POLICY IF EXISTS "Workouts viewable by self and friends" ON public.workouts;
DROP POLICY IF EXISTS "Workouts SELECT policy" ON public.workouts;

CREATE POLICY "Workouts SELECT policy" ON public.workouts FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR (
        visibility = 'friends' AND EXISTS (
            SELECT 1 FROM public.friends f
            WHERE f.user_id = auth.uid() AND f.friend_id = workouts.user_id
        )
    )
);

-- B. WORKOUT REACTIONS (Replacing SELECT and INSERT Policies Referencing legacy are_friends)
DROP POLICY IF EXISTS "Reactions viewable by authenticated users" ON public.workout_reactions;
DROP POLICY IF EXISTS "Reactions SELECT policy" ON public.workout_reactions;
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.workout_reactions;

CREATE POLICY "Reactions SELECT policy" ON public.workout_reactions FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workouts w
        WHERE w.id = workout_reactions.workout_id
        AND (
            w.user_id = auth.uid() OR (
                w.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM public.friends f
                    WHERE f.user_id = auth.uid() AND f.friend_id = w.user_id
                )
            )
        )
    )
);

CREATE POLICY "Users can insert own reactions" ON public.workout_reactions FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM public.workouts w
        WHERE w.id = workout_reactions.workout_id
        AND (
            w.user_id = auth.uid() OR (
                w.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM public.friends f
                    WHERE f.user_id = auth.uid() AND f.friend_id = w.user_id
                )
            )
        )
    )
);

-- C. CHALLENGES (Uses internal.is_challenge_member helper to break recursion)
DROP POLICY IF EXISTS "Challenges viewable by authenticated users" ON public.challenges;
DROP POLICY IF EXISTS "Challenges SELECT policy" ON public.challenges;

CREATE POLICY "Challenges SELECT policy" ON public.challenges FOR SELECT TO authenticated USING (
    creator_id = auth.uid() OR internal.is_challenge_member(id)
);

-- D. CHALLENGE MEMBERS (Uses internal helpers to break recursion)
DROP POLICY IF EXISTS "Challenge members viewable by all" ON public.challenge_members;
DROP POLICY IF EXISTS "Challenge members SELECT policy" ON public.challenge_members;

CREATE POLICY "Challenge members SELECT policy" ON public.challenge_members FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    internal.is_challenge_creator(challenge_id) OR
    internal.is_challenge_member(challenge_id)
);

-- E. USER ACHIEVEMENTS (Direct Non-Recursive EXISTS Query)
DROP POLICY IF EXISTS "User achievements viewable by all" ON public.user_achievements;
DROP POLICY IF EXISTS "User achievements SELECT policy" ON public.user_achievements;

CREATE POLICY "User achievements SELECT policy" ON public.user_achievements FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.friends f
        WHERE f.user_id = auth.uid() AND f.friend_id = user_achievements.user_id
    )
);

-- ==================================================
-- 5. SAFELY DROP OBSOLETE PUBLIC HELPERS (DEPENDENCY-FREE, NO CASCADE)
-- ==================================================
DROP FUNCTION IF EXISTS public.is_challenge_creator(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_challenge_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.are_friends(UUID, UUID);
DROP FUNCTION IF EXISTS public.has_existing_friend_request(UUID, UUID);
