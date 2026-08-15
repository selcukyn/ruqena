-- RUQENA Database Features Migration
-- Sprint 2: Invite to Challenge and Remove Friend RPCs
-- Migration Timestamp: 20260815170000

-- ==================================================
-- 1. CHALLENGE INVITATIONS RPC
-- ==================================================
CREATE OR REPLACE FUNCTION public.invite_to_challenge(p_challenge_id UUID, p_invitee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_challenge_title TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    -- Validate challenge exists
    SELECT title INTO v_challenge_title FROM public.challenges WHERE id = p_challenge_id;
    IF v_challenge_title IS NULL THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    -- Insert notification
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (
        p_invitee_id,
        'CHALLENGE_INVITE',
        'Yeni Challenge Daveti ⚔️',
        'Bir challenge''a davet edildin: ' || v_challenge_title,
        p_challenge_id::TEXT
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_to_challenge(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_to_challenge(UUID, UUID) TO authenticated;

-- ==================================================
-- 2. REMOVE FRIEND RPC
-- ==================================================
CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated caller';
    END IF;

    DELETE FROM public.friends 
    WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_friend(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;
