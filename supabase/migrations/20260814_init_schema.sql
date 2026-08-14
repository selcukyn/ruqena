-- RUQENA Database Schema & RLS Policies
-- Supabase PostgreSQL Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    weekly_goal INTEGER NOT NULL DEFAULT 3,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Friend Requests Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_friend_request UNIQUE(sender_id, receiver_id),
    CONSTRAINT no_self_request CHECK (sender_id <> receiver_id)
);

-- 3. Friends Table (Bidirectional representation)
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE(user_id, friend_id),
    CONSTRAINT no_self_friend CHECK (user_id <> friend_id)
);

-- 4. Workouts Table
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    distance_km NUMERIC CHECK (distance_km >= 0),
    calories INTEGER CHECK (calories >= 0),
    notes TEXT,
    image_url TEXT,
    workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Workout Reactions Table
CREATE TABLE IF NOT EXISTS public.workout_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('❤️', '🔥', '💪', '👏')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_workout_reaction UNIQUE(workout_id, user_id, reaction_type)
);

-- 6. Challenges Table
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('count', 'duration', 'distance', 'streak')),
    target_value NUMERIC NOT NULL CHECK (target_value > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_challenge_dates CHECK (end_date >= start_date)
);

-- 7. Challenge Members Table
CREATE TABLE IF NOT EXISTS public.challenge_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    progress NUMERIC NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_challenge_membership UNIQUE(challenge_id, user_id)
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Achievements Definition Table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 25
);

-- 10. User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

-- 11. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES for Query Optimization
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_workout_date ON public.workouts(workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_reactions_workout_id ON public.workout_reactions(workout_id);
CREATE INDEX IF NOT EXISTS idx_challenge_members_challenge ON public.challenge_members(challenge_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can view profiles, users can update their own
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Workouts: Viewable by self and friends
CREATE POLICY "Workouts viewable by self and friends" ON public.workouts FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.friends WHERE friends.user_id = auth.uid() AND friends.friend_id = workouts.user_id
    )
);
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Workout Reactions: Authenticated users can view and toggle reactions
CREATE POLICY "Reactions viewable by authenticated users" ON public.workout_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own reactions" ON public.workout_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON public.workout_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Friend Requests & Friends
CREATE POLICY "Friend requests viewable by participants" ON public.friend_requests FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend request" ON public.friend_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update received request" ON public.friend_requests FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);
CREATE POLICY "Friends viewable by user" ON public.friends FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Challenges & Members
CREATE POLICY "Challenges viewable by authenticated users" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Challenge members viewable by all" ON public.challenge_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Achievements
CREATE POLICY "Achievements viewable by all" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "User achievements viewable by all" ON public.user_achievements FOR SELECT TO authenticated USING (true);

-- Seed Default Achievements
INSERT INTO public.achievements (key, title, description, icon, xp_reward) VALUES
('first_workout', 'İlk Adım 👟', 'İlk antrenmanını tamamladın!', '👟', 25),
('streak_7', 'Haftalık Seri 🔥', '7 gün boyunca aralıksız antrenman yaptın!', '🔥', 50),
('workouts_10', 'Disiplin Abidesi 🏋️', '10 antrenman barajını aştın!', '🏋️', 50),
('workouts_25', 'Yarı Yüzlük 🎯', '25 antrenman tamamladın!', '🎯', 100),
('workouts_50', 'Efsane Sporcu 🏆', '50 antrenman seviyesine ulaştın!', '🏆', 200),
('first_challenge', 'Meydan Okuyan ⚔️', 'İlk challenge''ına katıldın!', '⚔️', 30),
('challenge_winner', 'Şampiyon 👑', 'Bir challenge''ı birincilikle bitirdin!', '👑', 150)
ON CONFLICT (key) DO NOTHING;
