-- RUQENA Feature Migration
-- Adds interactive accept/reject behavior to Challenge Invitations

-- ==================================================
-- 1. ADD ACTION STATUS TO NOTIFICATIONS
-- ==================================================
ALTER TABLE public.notifications
ADD COLUMN action_status TEXT CHECK (action_status IN ('pending', 'accepted', 'rejected'));

-- ==================================================
-- 2. UPDATE INVITE TO CHALLENGE RPC
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
          AND action_status = 'pending'
    ) THEN
        RETURN;
    END IF;
    
    -- Prevent if already member
    IF EXISTS (
        SELECT 1 FROM public.challenge_members 
        WHERE challenge_id = p_challenge_id AND user_id = p_invitee_id
    ) THEN
        RETURN;
    END IF;

    -- Insert notification with correct UUID type for reference_id and action_status pending
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, action_status)
    VALUES (
        p_invitee_id,
        'CHALLENGE_INVITE',
        'Yeni Challenge Daveti ⚔️',
        'Bir challenge''a davet edildin: ' || v_challenge_title,
        p_challenge_id,
        'pending'
    );
END;
$$;

-- ==================================================
-- 3. CREATE RESPOND CHALLENGE INVITE RPC
-- ==================================================
CREATE OR REPLACE FUNCTION public.respond_challenge_invite(p_notification_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_notif RECORD;
    v_challenge_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    IF p_status NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;

    -- Fetch notification
    SELECT * INTO v_notif 
    FROM public.notifications 
    WHERE id = p_notification_id AND user_id = auth.uid() AND type = 'CHALLENGE_INVITE';
    
    IF v_notif IS NULL THEN
        RAISE EXCEPTION 'Notification not found or unauthorized';
    END IF;

    IF v_notif.action_status <> 'pending' THEN
        RAISE EXCEPTION 'Invitation already %', v_notif.action_status;
    END IF;

    v_challenge_id := v_notif.reference_id;

    -- If accepting, add to challenge_members
    IF p_status = 'accepted' THEN
        -- Prevent duplicate member
        IF EXISTS (SELECT 1 FROM public.challenge_members WHERE challenge_id = v_challenge_id AND user_id = auth.uid()) THEN
            RAISE EXCEPTION 'Already a member';
        END IF;

        INSERT INTO public.challenge_members (challenge_id, user_id)
        VALUES (v_challenge_id, auth.uid());
    END IF;

    -- Update notification
    UPDATE public.notifications
    SET action_status = p_status, is_read = TRUE
    WHERE id = p_notification_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_challenge_invite(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_challenge_invite(UUID, TEXT) TO authenticated;
