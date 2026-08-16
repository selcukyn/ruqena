-- Update send_friend_request RPC to create an in-app notification

CREATE OR REPLACE FUNCTION public.send_friend_request(p_receiver_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_id UUID;
    v_sender_name TEXT;
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

    -- Get sender profile for notification
    SELECT username INTO v_sender_name FROM public.profiles WHERE id = auth.uid();
    IF v_sender_name IS NULL THEN
        v_sender_name := 'Biri';
    END IF;

    -- Create in-app notification only if an unread one for this request doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE reference_id = v_new_id 
          AND type = 'FRIEND_REQUEST' 
          AND is_read = false
    ) THEN
        INSERT INTO public.notifications (user_id, type, title, message, reference_id)
        VALUES (
            p_receiver_id,
            'FRIEND_REQUEST',
            'Yeni Arkadaşlık İsteği 👥',
            v_sender_name || ' sana bir arkadaşlık isteği gönderdi.',
            v_new_id
        );
    END IF;

    RETURN v_new_id;
END;
$$;
