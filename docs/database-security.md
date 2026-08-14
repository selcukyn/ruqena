# RUQENA — Database Security & RLS Architecture (Sprint 1A)

This document details the hardened PostgreSQL database schema, Row Level Security (RLS) policies, RPC security, and verification matrix for the RUQENA MVP.

---

## 🔐 1. Database Table & RLS Model Summary

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `public.profiles` | ✅ | Authenticated users | System Trigger Only | Owner (`auth.uid() = id`) | Denied |
| `public.friend_requests` | ✅ | Participants (`sender_id` or `receiver_id`) | Sender (`auth.uid() = sender_id`) with uniqueness & non-self check | Receiver (`auth.uid() = receiver_id`) | Denied |
| `public.friends` | ✅ | Friendship members (`user_id` or `friend_id`) | `accept_friend_request` RPC only | Denied | Denied |
| `public.workouts` | ✅ | Owner OR (accepted friend AND `visibility = 'friends'`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) |
| `public.workout_reactions` | ✅ | Allowed if parent workout is viewable by user | Owner (`auth.uid() = user_id`) & parent workout viewable | Denied | Owner (`auth.uid() = user_id`) |
| `public.challenges` | ✅ | Creator OR challenge member | Creator (`auth.uid() = creator_id`) with date/target checks | Denied | Denied |
| `public.challenge_members` | ✅ | Challenge creator OR challenge members | Self (`auth.uid() = user_id`) & valid challenge | Denied | Denied |
| `public.notifications` | ✅ | Owner (`auth.uid() = user_id`) | System / Database Trigger Only | Owner (`auth.uid() = user_id`) (`is_read` only) | Denied |
| `public.achievements` | ✅ | Global viewable (`USING (true)`) | Denied | Denied | Denied |
| `public.user_achievements` | ✅ | Self OR accepted friends | System / Database Trigger Only | Denied | Denied |
| `public.push_subscriptions` | ✅ | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) | Owner (`auth.uid() = user_id`) |

---

## 🔒 2. Key Security Mechanisms

### Workout Privacy Enforcers (`visibility`)
* Workouts contain a `visibility` column: `'friends'` (default) or `'private'`.
* **Private Workouts**: Enforced at PostgreSQL RLS layer. Never visible to friends or 3rd parties regardless of client query filters.
* **Reactions**: Inherit the exact RLS viewability rules of the parent workout.

### Atomic Friendship RPC (`public.accept_friend_request`)
* Friendship records (`public.friends`) **cannot** be inserted directly by clients.
* `accept_friend_request(p_request_id UUID)` is a `SECURITY DEFINER` function with `SET search_path = public, pg_temp`.
* Validates caller is the request receiver, updates status to `'accepted'`, and creates bidirectional `(A → B)` and `(B → A)` rows atomically.

### Gamification & XP Anti-Tampering Trigger
* Trigger `trg_prevent_profile_gamification_tampering` runs `BEFORE UPDATE ON public.profiles`.
* Automatically reverts any direct client modification to `total_xp`, `current_streak`, or `longest_streak` unless initiated by `service_role` or trusted server context.

### Automatic Profile Creation
* `on_auth_user_created` trigger fires `AFTER INSERT ON auth.users`.
* Safe `handle_new_user()` populates `public.profiles` using `NEW.id` and safe metadata extraction with fallback values.

---

## 🧪 3. Verification & SQL Test Matrix (14 Scenarios)

```sql
-- SQL Verification Script for RLS Policies & Hardening

-- Scenario 1: User A creates a private workout; User B (friend) must NOT see it.
-- Scenario 2: User A creates a friends-only workout; User B (friend) CAN see it.
-- Scenario 3: User A creates a friends-only workout; User C (non-friend) must NOT see it.
-- Scenario 4: User A creates a challenge; User B (non-member) must NOT see it.
-- Scenario 5: User A creates a challenge; User B joins; User B CAN see it.
-- Scenario 6: User C (non-member) cannot enumerate challenge members.
-- Scenario 7: User A sends friend request to B; User C cannot see it.
-- Scenario 8: User B accepts request via accept_friend_request(id); A ↔ B created.
-- Scenario 9: User C cannot insert arbitrary friendships into public.friends.
-- Scenario 10: User A cannot UPDATE User B's profile.
-- Scenario 11: User A UPDATE on own profile with total_xp = 999999 is blocked/reverted by trigger.
-- Scenario 12: User A cannot read User B's push_subscriptions endpoint.
-- Scenario 13: User A cannot INSERT notifications for User B directly.
-- Scenario 14: User A cannot grant themselves user_achievements directly.
```

---

## 🔮 4. Known Limitations & Deferred Server-Side Features
* **Notification Generation**: Will be fully wired via trusted server-side triggers / Edge Functions in Sprint 1B/2.
* **Achievement Unlocking**: Will be calculated server-side during workout creation in Sprint 1B.
