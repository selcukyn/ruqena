# RUQENA — Database Security & RLS Architecture (Sprint 1A Audit Final)

This document details the hardened PostgreSQL database schema, Row Level Security (RLS) policies, RPC security, and recursion-free helper functions for the RUQENA MVP.

---

## 🔐 1. Database Table & RLS Model Summary

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.profiles` | ✅ | Authenticated users | System Trigger Only (`handle_new_user`) | Owner (`auth.uid() = id`) | Denied |
| `public.friend_requests` | ✅ | Participants (`sender_id` or `receiver_id`) | Denied (`send_friend_request` RPC only) | Denied (`respond_to_friend_request` RPC only) | Denied |
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

1. **`public.send_friend_request(p_receiver_id UUID) RETURNS UUID`**:
   * Validates non-self request, checks `are_friends()`, checks `has_existing_friend_request()`, and inserts pending request.
   * Handles unique constraint violations cleanly with custom exception.
   * `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

2. **`public.respond_to_friend_request(p_request_id UUID, p_status TEXT) RETURNS VOID`**:
   * Authoritative handler for responding to requests (`'accepted'` or `'rejected'`).
   * Uses `FOR UPDATE` row locking to prevent concurrent response race conditions.
   * Validates `auth.uid() = receiver_id` and current status is `'pending'`.
   * Atomically updates status and creates bidirectional friendship rows `(A → B)` and `(B → A)` in a single transaction if accepted.
   * `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

3. **`public.join_challenge(p_challenge_id UUID) RETURNS VOID`**:
   * Authoritative handler for joining challenges.
   * Verifies challenge existence, checks `CURRENT_DATE BETWEEN start_date AND end_date`, and verifies caller is creator OR accepted friend of creator.
   * Inserts `auth.uid()` as a member with `ON CONFLICT DO NOTHING`.
   * `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated;`

---

## 🛡️ 3. Helper Function Permissions

Helper functions (`is_challenge_creator`, `is_challenge_member`, `are_friends`, `has_existing_friend_request`) are executed strictly within database/RLS context:
```sql
REVOKE EXECUTE ON FUNCTION public.is_challenge_creator(UUID, UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_challenge_member(UUID, UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.are_friends(UUID, UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_existing_friend_request(UUID, UUID) FROM PUBLIC, authenticated;
```
This prevents clients from invoking helper functions as arbitrary cross-user relationship discovery APIs.

---

## 📌 4. Indexes & Constraints
* **Partial Pending Unique Index**:
  ```sql
  CREATE UNIQUE INDEX unique_bidirectional_pending_friend_request 
  ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';
  ```
  Allows users to re-request after a rejection while strictly blocking concurrent duplicate pending requests.

---

## 🧪 5. Verification & Build Validation
* **TypeScript Type Check**: `npx tsc --noEmit` (0 errors)
* **Next.js Production Build**: `npm run build` (Compiled successfully)
