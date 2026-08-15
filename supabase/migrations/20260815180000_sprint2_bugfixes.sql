-- RUQENA Bug Fix Migration
-- Fixes Challenge Invite reference_id type issue and missing security checks.
-- Fixes Friend Request unique constraint violation on re-adding.

-- ==================================================
-- 1. FIX CHALLENGE INVITATION RPC
-- ==================================================
CREATE OR REPLACE FUNCTION public.invite_to_challenge(p_challenge_id UUID, p_invitee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_challenge_title TEXT;
    v_creator_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    IF auth.uid() = p_invitee_id THEN
        RAISE EXCEPTION 'Cannot invite yourself';
    END IF;

    -- Validate challenge exists and caller is creator
    SELECT title, creator_id INTO v_challenge_title, v_creator_id 
    FROM public.challenges 
    WHERE id = p_challenge_id;
    
    IF v_challenge_title IS NULL THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    IF v_creator_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the challenge creator can invite friends';
    END IF;

    -- Validate friendship
    IF NOT EXISTS (
        SELECT 1 FROM public.friends 
        WHERE (user_id = auth.uid() AND friend_id = p_invitee_id)
           OR (user_id = p_invitee_id AND friend_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Can only invite friends';
    END IF;

    -- Prevent duplicate pending notifications
    IF EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_invitee_id 
          AND type = 'CHALLENGE_INVITE' 
          AND reference_id = p_challenge_id
    ) THEN
        RETURN;
    END IF;

    -- Insert notification with correct UUID type for reference_id
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (
        p_invitee_id,
        'CHALLENGE_INVITE',
        'Yeni Challenge Daveti ⚔️',
        'Bir challenge''a davet edildin: ' || v_challenge_title,
        p_challenge_id
    );
END;
$$;

-- ==================================================
-- 2. FIX SEND FRIEND REQUEST RPC
-- ==================================================
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

    -- Inline friend check
    IF EXISTS (
        SELECT 1 FROM public.friends
        WHERE user_id = auth.uid() AND friend_id = p_receiver_id
    ) THEN
        RAISE EXCEPTION 'Users are already friends';
    END IF;

    -- Inline pending request check
    IF EXISTS (
        SELECT 1 FROM public.friend_requests
        WHERE ((sender_id = auth.uid() AND receiver_id = p_receiver_id)
            OR (sender_id = p_receiver_id AND receiver_id = auth.uid()))
          AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'A pending friend request already exists between these users';
    END IF;

    -- Upsert to avoid unique constraint violations on previously rejected/accepted requests
    INSERT INTO public.friend_requests (sender_id, receiver_id, status, created_at)
    VALUES (auth.uid(), p_receiver_id, 'pending', NOW())
    ON CONFLICT (sender_id, receiver_id) 
    DO UPDATE SET status = 'pending', created_at = NOW()
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
