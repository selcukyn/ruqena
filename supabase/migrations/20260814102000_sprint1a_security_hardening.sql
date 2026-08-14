-- RUQENA Database Schema & RLS Hardening Migration
-- Sprint 1A: Database Security & RLS Hardening (Final Audit Fixes)
-- Migration Timestamp: 20260814102000

-- ==================================================
-- 0. SECURITY DEFINER HELPER FUNCTIONS (INTERNAL ONLY - NO RLS RECURSION)
-- ==================================================

-- Helper 1: Check if a user is creator of a challenge
CREATE OR REPLACE FUNCTION public.is_challenge_creator(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.challenges
        WHERE id = p_challenge_id AND creator_id = p_user_id
    );
$$;

-- Helper 2: Check if a user is a member of a challenge
CREATE OR REPLACE FUNCTION public.is_challenge_member(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.challenge_members
        WHERE challenge_id = p_challenge_id AND user_id = p_user_id
    );
$$;

-- Helper 3: Check if two users are accepted friends
CREATE OR REPLACE FUNCTION public.are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.friends
        WHERE user_id = p_user_a AND friend_id = p_user_b
    );
$$;

-- Helper 4: Check existing pending friend request in either direction
CREATE OR REPLACE FUNCTION public.has_existing_friend_request(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.friend_requests
        WHERE ((sender_id = p_user_a AND receiver_id = p_user_b)
            OR (sender_id = p_user_b AND receiver_id = p_user_a))
          AND status = 'pending'
    );
$$;

-- Revoke client execution privileges on helper functions to prevent user enumeration
REVOKE EXECUTE ON FUNCTION public.is_challenge_creator(UUID, UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_challenge_member(UUID, UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.are_friends(UUID, UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_existing_friend_request(UUID, UUID) FROM PUBLIC, authenticated;

-- ==================================================
-- 1. WORKOUT PRIVACY & CONSTRAINTS
-- ==================================================
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'friends';

ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_visibility_check;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_visibility_check CHECK (visibility IN ('friends', 'private'));

-- Drop old workout SELECT policies
DROP POLICY IF EXISTS "Workouts viewable by self and friends" ON public.workouts;
DROP POLICY IF EXISTS "Workouts SELECT policy" ON public.workouts;

-- Enforce strict workout SELECT policy using are_friends helper:
CREATE POLICY "Workouts SELECT policy" ON public.workouts FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR (
        visibility = 'friends' AND public.are_friends(auth.uid(), user_id)
    )
);

DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE TO authenticated USING (
    auth.uid() = user_id
);

-- ==================================================
-- 2. WORKOUT REACTIONS RLS HARDENING
-- ==================================================
DROP POLICY IF EXISTS "Reactions viewable by authenticated users" ON public.workout_reactions;
DROP POLICY IF EXISTS "Reactions SELECT policy" ON public.workout_reactions;

CREATE POLICY "Reactions SELECT policy" ON public.workout_reactions FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workouts w
        WHERE w.id = workout_reactions.workout_id
        AND (
            w.user_id = auth.uid() OR (
                w.visibility = 'friends' AND public.are_friends(auth.uid(), w.user_id)
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can insert own reactions" ON public.workout_reactions;
CREATE POLICY "Users can insert own reactions" ON public.workout_reactions FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM public.workouts w
        WHERE w.id = workout_reactions.workout_id
        AND (
            w.user_id = auth.uid() OR (
                w.visibility = 'friends' AND public.are_friends(auth.uid(), w.user_id)
            )
        )
    )
);

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.workout_reactions;
CREATE POLICY "Users can delete own reactions" ON public.workout_reactions FOR DELETE TO authenticated USING (
    auth.uid() = user_id
);

-- ==================================================
-- 3. FRIEND REQUEST SECURITY & ATOMIC RPCs
-- ==================================================

-- Safely replace old full index with partial unique index for PENDING requests only
DROP INDEX IF EXISTS public.unique_bidirectional_friend_request;
DROP INDEX IF EXISTS public.unique_bidirectional_pending_friend_request;

CREATE UNIQUE INDEX unique_bidirectional_pending_friend_request 
ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
WHERE status = 'pending';

-- Drop obsolete RPC if it exists
DROP FUNCTION IF EXISTS public.accept_friend_request(UUID);

-- RPC 1: Send Friend Request (Race-safe via unique index & exception catching)
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

    IF public.are_friends(auth.uid(), p_receiver_id) THEN
        RAISE EXCEPTION 'Users are already friends';
    END IF;

    IF public.has_existing_friend_request(auth.uid(), p_receiver_id) THEN
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

-- RPC 2: Respond to Friend Request (Accept or Reject with FOR UPDATE row locking)
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

    -- Row locking with FOR UPDATE prevents concurrent race conditions
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

    -- Update request status
    UPDATE public.friend_requests
    SET status = p_status
    WHERE id = p_request_id;

    -- If accepted, create bidirectional friendship records atomically
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

-- RLS Policies for Friend Requests
DROP POLICY IF EXISTS "Friend requests viewable by participants" ON public.friend_requests;
DROP POLICY IF EXISTS "Friend requests SELECT policy" ON public.friend_requests;
CREATE POLICY "Friend requests SELECT policy" ON public.friend_requests FOR SELECT TO authenticated USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- REMOVE ALL DIRECT CLIENT INSERT & UPDATE POLICIES ON friend_requests
-- All request creations & responses MUST go through send_friend_request() and respond_to_friend_request() RPCs
DROP POLICY IF EXISTS "Users can send friend request" ON public.friend_requests;
DROP POLICY IF EXISTS "Friend requests INSERT policy" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can update received request" ON public.friend_requests;
DROP POLICY IF EXISTS "Friend requests UPDATE policy" ON public.friend_requests;

-- ==================================================
-- 4. FRIENDSHIP RLS
-- ==================================================
DROP POLICY IF EXISTS "Friends viewable by user" ON public.friends;
DROP POLICY IF EXISTS "Friends SELECT policy" ON public.friends;
CREATE POLICY "Friends SELECT policy" ON public.friends FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

-- Note: No direct client INSERT or UPDATE policies exist on public.friends.

-- ==================================================
-- 5. CHALLENGE VISIBILITY & AUTHORIZED JOIN RPC
-- ==================================================
DROP POLICY IF EXISTS "Challenges viewable by authenticated users" ON public.challenges;
DROP POLICY IF EXISTS "Challenges SELECT policy" ON public.challenges;
CREATE POLICY "Challenges SELECT policy" ON public.challenges FOR SELECT TO authenticated USING (
    creator_id = auth.uid() OR public.is_challenge_member(id, auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Challenges INSERT policy" ON public.challenges;
CREATE POLICY "Challenges INSERT policy" ON public.challenges FOR INSERT TO authenticated WITH CHECK (
    creator_id = auth.uid() AND target_value > 0 AND end_date >= start_date
);

-- RPC: Join Challenge (Validates caller authorization & challenge active dates)
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

    -- Verify active dates
    IF CURRENT_DATE < v_start_date OR CURRENT_DATE > v_end_date THEN
        RAISE EXCEPTION 'Challenge is not currently active';
    END IF;

    -- Authorization rule: Caller must be creator OR an accepted friend of creator
    IF v_creator_id <> auth.uid() AND NOT public.are_friends(auth.uid(), v_creator_id) THEN
        RAISE EXCEPTION 'Not authorized to join this challenge';
    END IF;

    INSERT INTO public.challenge_members (challenge_id, user_id, progress)
    VALUES (p_challenge_id, auth.uid(), 0)
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_challenge(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_challenge(UUID) TO authenticated;

-- RLS Policies for Challenge Members
DROP POLICY IF EXISTS "Challenge members viewable by all" ON public.challenge_members;
DROP POLICY IF EXISTS "Challenge members SELECT policy" ON public.challenge_members;
CREATE POLICY "Challenge members SELECT policy" ON public.challenge_members FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    public.is_challenge_creator(challenge_id, auth.uid()) OR
    public.is_challenge_member(challenge_id, auth.uid())
);

-- REMOVE DIRECT CLIENT INSERT POLICY ON challenge_members
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_members;
DROP POLICY IF EXISTS "Challenge members INSERT policy" ON public.challenge_members;

-- ==================================================
-- 6. AUTOMATIC PROFILE CREATION WITH USERNAME COLLISION HANDLING
-- ==================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_username TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        'user_' || substring(replace(NEW.id::text, '-', '') from 1 for 8)
    );
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1),
        'Sporcu'
    );
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

    BEGIN
        INSERT INTO public.profiles (
            id,
            username,
            display_name,
            avatar_url,
            weekly_goal,
            current_streak,
            longest_streak,
            total_xp
        ) VALUES (
            NEW.id,
            v_username,
            v_display_name,
            v_avatar_url,
            3,
            0,
            0,
            0
        );
    EXCEPTION WHEN unique_violation THEN
        -- Handle username collision by appending a unique short suffix
        v_username := v_username || '_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 4);
        INSERT INTO public.profiles (
            id,
            username,
            display_name,
            avatar_url,
            weekly_goal,
            current_streak,
            longest_streak,
            total_xp
        ) VALUES (
            NEW.id,
            v_username,
            v_display_name,
            v_avatar_url,
            3,
            0,
            0,
            0
        )
        ON CONFLICT (id) DO NOTHING;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- 7. XP & STREAK GAMIFICATION ANTI-TAMPERING TRIGGER
-- ==================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_gamification_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.total_xp IS DISTINCT FROM OLD.total_xp OR
        NEW.current_streak IS DISTINCT FROM OLD.current_streak OR
        NEW.longest_streak IS DISTINCT FROM OLD.longest_streak) THEN
        
        IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
            NEW.total_xp := OLD.total_xp;
            NEW.current_streak := OLD.current_streak;
            NEW.longest_streak := OLD.longest_streak;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_gamification_tampering ON public.profiles;
CREATE TRIGGER trg_prevent_profile_gamification_tampering
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_gamification_tampering();

-- ==================================================
-- 8. PUSH SUBSCRIPTIONS SECURITY
-- ==================================================
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS unique_push_endpoint;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT unique_push_endpoint UNIQUE (endpoint);

DROP POLICY IF EXISTS "Push subscriptions SELECT policy" ON public.push_subscriptions;
CREATE POLICY "Push subscriptions SELECT policy" ON public.push_subscriptions FOR SELECT TO authenticated USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Push subscriptions INSERT policy" ON public.push_subscriptions;
CREATE POLICY "Push subscriptions INSERT policy" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Push subscriptions UPDATE policy" ON public.push_subscriptions;
CREATE POLICY "Push subscriptions UPDATE policy" ON public.push_subscriptions FOR UPDATE TO authenticated USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Push subscriptions DELETE policy" ON public.push_subscriptions;
CREATE POLICY "Push subscriptions DELETE policy" ON public.push_subscriptions FOR DELETE TO authenticated USING (
    auth.uid() = user_id
);

-- ==================================================
-- 9. USER ACHIEVEMENTS & NOTIFICATIONS RLS AUDIT
-- ==================================================
DROP POLICY IF EXISTS "User achievements viewable by all" ON public.user_achievements;
DROP POLICY IF EXISTS "User achievements SELECT policy" ON public.user_achievements;
CREATE POLICY "User achievements SELECT policy" ON public.user_achievements FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR public.are_friends(auth.uid(), user_id)
);
