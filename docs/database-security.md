# RUQENA — Database Security & RLS Architecture (Sprint 1A Final Hardened)

This document details the hardened PostgreSQL database schema, Row Level Security (RLS) policies, RPC security, and recursion-free helper functions for the RUQENA MVP.

---

## 🔐 1. Database Table & RLS Model Summary

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.profiles` | ✅ | Authenticated users | System Trigger Only (`handle_new_user`) | Owner (`auth.uid() = id`) | Denied |
| `public.friend_requests` | ✅ | Participants (`sender_id` or `receiver_id`) | Controlled (`send_friend_request` RPC / strictly validated INSERT) | Denied (Handled via `respond_to_friend_request` RPC) | Denied |
| `public.friends` | ✅ | Friendship members (`user_id` or `friend_id`) | Denied (`respond_to_friend_request` RPC only) | Denied | Denied |
| `public.workouts` | ✅ | Owner OR (accepted friend via `are_friends` AND `visibility = 'friends'`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) |
| `public.workout_reactions` | ✅ | Allowed if parent workout is viewable by user | Owner (`auth.uid() = user_id`) & parent workout viewable | Denied | Owner (`auth.uid() = user_id`) |
| `public.challenges` | ✅ | Creator OR `is_challenge_member()` | Creator (`auth.uid() = creator_id`) with date/target checks | Denied | Denied |
| `public.challenge_members` | ✅ | Self OR `is_challenge_creator()` OR `is_challenge_member()` | Denied (`join_challenge` RPC only) | Denied | Denied |
| `public.notifications` | ✅ | Owner (`auth.uid() = user_id`) | System / Database Trigger Only | Owner (`auth.uid() = user_id`) (`is_read` only) | Denied |
| `public.achievements` | ✅ | Global viewable (`USING (true)`) | Denied | Denied | Denied |
| `public.user_achievements` | ✅ | Self OR `are_friends()` | System / Database Trigger Only | Denied | Denied |
| `public.push_subscriptions` | ✅ | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) |

---

## 🔑 2. Controlled Database RPCs & Security Model

All sensitive state transitions are encapsulated in `SECURITY DEFINER` RPC functions with `SET search_path = public, pg_temp` and explicit execution grants:

1. **`public.send_friend_request(p_receiver_id UUID) RETURNS UUID`**:
   * Validates non-self request, checks `are_friends()`, checks `has_existing_friend_request()`, and inserts pending request.
   * `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

2. **`public.respond_to_friend_request(p_request_id UUID, p_status TEXT) RETURNS VOID`**:
   * Authoritative handler for responding to requests (`'accepted'` or `'rejected'`).
   * Validates `auth.uid() = receiver_id` and current status is `'pending'`.
   * Atomically updates status and creates bidirectional friendship rows `(A → B)` and `(B → A)` in a single transaction if accepted.
   * `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

3. **`public.join_challenge(p_challenge_id UUID) RETURNS VOID`**:
   * Authoritative handler for joining challenges.
   * Verifies challenge existence and inserts `auth.uid()` as a member with `ON CONFLICT DO NOTHING`.
   * `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

---

## 🛡️ 3. SECURITY DEFINER Helper Functions (Zero RLS Recursion)

All cross-table authorization queries are executed via helper functions:

1. `public.is_challenge_creator(p_challenge_id UUID, p_user_id UUID)`
2. `public.is_challenge_member(p_challenge_id UUID, p_user_id UUID)`
3. `public.are_friends(p_user_a UUID, p_user_b UUID)`
4. `public.has_existing_friend_request(p_user_a UUID, p_user_b UUID)`

All helper functions have `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`.

---

## 👤 4. Profile Username Collision & Bidirectional Request Integrity
* **Username Collision**: `handle_new_user()` trigger catches PostgreSQL `unique_violation` exception on `public.profiles(username)` and appends a unique short 4-character suffix (e.g. `_a1b2`) to ensure registration transactions never fail.
* **Bidirectional Request Uniqueness**: Indexed via `CREATE UNIQUE INDEX unique_bidirectional_friend_request ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));`.

---

## 🧪 5. Verification & Build Validation
* **TypeScript Type Check**: `npx tsc --noEmit` (0 errors)
* **Next.js Production Build**: `npm run build` (Compiled successfully)
