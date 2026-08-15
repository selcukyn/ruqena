-- RUQENA Database Schema & RLS Hardening Migration
-- Comprehensive Table-Level Privileges Fix for Authenticated Role (Strict Minimum Privileges Model)
-- Migration Timestamp: 20260814150000

-- ==================================================
-- 1. REVOKE ALL PRIVILEGES FROM PUBLIC AND ANON ROLES
-- ==================================================
-- Ensure unauthenticated (anon) users receive ZERO table-level access to internal application data.

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.workouts FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.workout_reactions FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.challenges FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.challenge_members FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.friend_requests FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.friends FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.achievements FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.user_achievements FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon;

-- ==================================================
-- 2. GRANT STRICT MINIMUM TABLE-LEVEL DCL PRIVILEGES TO AUTHENTICATED ROLE
-- ==================================================
-- In PostgreSQL, RLS policy evaluation requires underlying table-level DCL privileges.
-- Grant ONLY the exact operations invoked by client queries in DataService.

-- Profiles: SELECT (viewing profiles), INSERT (initial creation under auth.uid() = id), UPDATE (profile edit)
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Workouts: SELECT (feed/profile workouts), INSERT (createWorkout), DELETE (deleteWorkout)
GRANT SELECT, INSERT, DELETE ON TABLE public.workouts TO authenticated;

-- Workout Reactions: SELECT (view reactions), INSERT (add reaction), DELETE (remove reaction)
GRANT SELECT, INSERT, DELETE ON TABLE public.workout_reactions TO authenticated;

-- Challenges: SELECT (view challenges), INSERT (createChallenge)
GRANT SELECT, INSERT ON TABLE public.challenges TO authenticated;

-- Challenge Members: SELECT (view challenge members nested in queries; joining is via SECURITY DEFINER RPC)
GRANT SELECT ON TABLE public.challenge_members TO authenticated;

-- Notifications: SELECT (fetch notifications), UPDATE (markNotificationAsRead)
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;

-- Friend Requests: SELECT (fetch pending requests; sending/responding is via SECURITY DEFINER RPCs)
GRANT SELECT ON TABLE public.friend_requests TO authenticated;

-- Friends: SELECT (fetch friend list; relationship mutations are via RPC)
GRANT SELECT ON TABLE public.friends TO authenticated;

-- Achievements & User Achievements: SELECT (read-only for client)
GRANT SELECT ON TABLE public.achievements TO authenticated;
GRANT SELECT ON TABLE public.user_achievements TO authenticated;

-- Push Subscriptions: 0 privileges (not queried by client application)
REVOKE ALL ON TABLE public.push_subscriptions FROM authenticated;

-- ==================================================
-- 3. ENSURE RLS REMAINS ENABLED ON ALL TABLES
-- ==================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- 4. HARDEN AND ALIGN RLS POLICIES FOR ALL TABLES
-- ==================================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- WORKOUTS POLICIES
DROP POLICY IF EXISTS "Workouts viewable by self and friends" ON public.workouts;
DROP POLICY IF EXISTS "Workouts SELECT policy" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;

CREATE POLICY "Workouts SELECT policy"
ON public.workouts FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR (
        visibility = 'friends' AND EXISTS (
            SELECT 1 FROM public.friends f
            WHERE f.user_id = auth.uid() AND f.friend_id = workouts.user_id
        )
    )
);

CREATE POLICY "Users can insert own workouts"
ON public.workouts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
ON public.workouts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- WORKOUT REACTIONS POLICIES
DROP POLICY IF EXISTS "Reactions viewable by authenticated users" ON public.workout_reactions;
DROP POLICY IF EXISTS "Reactions SELECT policy" ON public.workout_reactions;
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.workout_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.workout_reactions;

CREATE POLICY "Reactions SELECT policy"
ON public.workout_reactions FOR SELECT
TO authenticated
USING (
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

CREATE POLICY "Users can insert own reactions"
ON public.workout_reactions FOR INSERT
TO authenticated
WITH CHECK (
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

CREATE POLICY "Users can delete own reactions"
ON public.workout_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- CHALLENGES POLICIES
DROP POLICY IF EXISTS "Challenges viewable by authenticated users" ON public.challenges;
DROP POLICY IF EXISTS "Challenges SELECT policy" ON public.challenges;
DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Challenges INSERT policy" ON public.challenges;

CREATE POLICY "Challenges SELECT policy"
ON public.challenges FOR SELECT
TO authenticated
USING (
    creator_id = auth.uid() OR internal.is_challenge_member(id)
);

CREATE POLICY "Challenges INSERT policy"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- CHALLENGE MEMBERS POLICIES
DROP POLICY IF EXISTS "Challenge members viewable by all" ON public.challenge_members;
DROP POLICY IF EXISTS "Challenge members SELECT policy" ON public.challenge_members;

CREATE POLICY "Challenge members SELECT policy"
ON public.challenge_members FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    internal.is_challenge_creator(challenge_id) OR
    internal.is_challenge_member(challenge_id)
);

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications SELECT policy" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications UPDATE policy" ON public.notifications;

CREATE POLICY "Notifications SELECT policy"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Notifications UPDATE policy"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS POLICIES
DROP POLICY IF EXISTS "Achievements viewable by all" ON public.achievements;
DROP POLICY IF EXISTS "Achievements SELECT policy" ON public.achievements;

CREATE POLICY "Achievements SELECT policy"
ON public.achievements FOR SELECT
TO authenticated
USING (true);

-- USER ACHIEVEMENTS POLICIES
DROP POLICY IF EXISTS "User achievements viewable by all" ON public.user_achievements;
DROP POLICY IF EXISTS "User achievements SELECT policy" ON public.user_achievements;

CREATE POLICY "User achievements SELECT policy"
ON public.user_achievements FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.friends f
        WHERE f.user_id = auth.uid() AND f.friend_id = user_achievements.user_id
    )
);

-- FRIEND REQUESTS POLICIES
DROP POLICY IF EXISTS "Friend requests viewable by participants" ON public.friend_requests;
DROP POLICY IF EXISTS "Friend requests SELECT policy" ON public.friend_requests;

CREATE POLICY "Friend requests SELECT policy"
ON public.friend_requests FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- FRIENDS POLICIES
DROP POLICY IF EXISTS "Friends viewable by user" ON public.friends;
DROP POLICY IF EXISTS "Friends SELECT policy" ON public.friends;

CREATE POLICY "Friends SELECT policy"
ON public.friends FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());
