# RUQENA — Database Security & RLS Architecture (Sprint 1A Hardened)

This document details the hardened PostgreSQL database schema, Row Level Security (RLS) policies, RPC security, and recursion-free helper functions for the RUQENA MVP.

---

## 🔐 1. Database Table & RLS Model Summary

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.profiles` | ✅ | Authenticated users | System Trigger Only (`handle_new_user`) | Owner (`auth.uid() = id`) | Denied |
| `public.friend_requests` | ✅ | Participants (`sender_id` or `receiver_id`) | Sender (`auth.uid() = sender_id`) via `has_existing_friend_request` check | Receiver (`auth.uid() = receiver_id`) | Denied |
| `public.friends` | ✅ | Friendship members (`user_id` or `friend_id`) | `accept_friend_request` RPC only | Denied | Denied |
| `public.workouts` | ✅ | Owner OR (accepted friend via `are_friends` AND `visibility = 'friends'`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) |
| `public.workout_reactions` | ✅ | Allowed if parent workout is viewable by user | Owner (`auth.uid() = user_id`) & parent workout viewable | Denied | Owner (`auth.uid() = user_id`) |
| `public.challenges` | ✅ | Creator OR `is_challenge_member()` | Creator (`auth.uid() = creator_id`) with date/target checks | Denied | Denied |
| `public.challenge_members` | ✅ | Self OR `is_challenge_creator()` OR `is_challenge_member()` | Self (`auth.uid() = user_id`) & valid challenge | Denied | Denied |
| `public.notifications` | ✅ | Owner (`auth.uid() = user_id`) | System / Database Trigger Only | Owner (`auth.uid() = user_id`) (`is_read` only) | Denied |
| `public.achievements` | ✅ | Global viewable (`USING (true)`) | Denied | Denied | Denied |
| `public.user_achievements` | ✅ | Self OR `are_friends()` | System / Database Trigger Only | Denied | Denied |
| `public.push_subscriptions` | ✅ | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) |

---

## 🛡️ 2. SECURITY DEFINER Helper Functions (Zero RLS Recursion)

To completely eliminate circular policy evaluation loops (RLS infinite recursion), all cross-table authorization checks are encapsulated in `SECURITY DEFINER` functions with `SET search_path = public, pg_temp`:

1. **`public.is_challenge_creator(p_challenge_id UUID, p_user_id UUID)`**:
   * Evaluates if `p_user_id` is the creator of `p_challenge_id` without triggering `challenges` SELECT policy recursion.
2. **`public.is_challenge_member(p_challenge_id UUID, p_user_id UUID)`**:
   * Evaluates if `p_user_id` is an active member of `p_challenge_id` without triggering `challenge_members` SELECT policy recursion.
3. **`public.are_friends(p_user_a UUID, p_user_b UUID)`**:
   * Evaluates bidirectional friendship status between User A and User B.
4. **`public.has_existing_friend_request(p_user_a UUID, p_user_b UUID)`**:
   * Evaluates if a pending/accepted request already exists in either direction `(A → B)` or `(B → A)` without triggering `friend_requests` INSERT policy recursion.

---

## 🔑 3. RPC Security & Execution Permissions

### Atomic Friendship RPC (`public.accept_friend_request`)
* **Security Model**: `SECURITY DEFINER`, `SET search_path = public, pg_temp`.
* **Authorization**: Checks `v_receiver_id = auth.uid()` and `status = 'pending'`.
* **Execution Privileges**:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.accept_friend_request(UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
  ```

---

## 👤 4. Profile Username Collision Strategy
* `handle_new_user()` trigger catches PostgreSQL `unique_violation` exception on `public.profiles(username)`.
* If a preferred metadata username collides with an existing profile username, the trigger dynamically appends a unique short random suffix (e.g., `_a1b2`) and retries insertion safely without aborting the `auth.users` signup transaction.

---

## 🧪 5. Verification & Build Validation
* **TypeScript Type Check**: `npx tsc --noEmit` (0 errors)
* **Next.js Production Build**: `npm run build` (Compiled successfully)
