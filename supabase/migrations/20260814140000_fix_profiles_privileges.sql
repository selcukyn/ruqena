-- RUQENA Database Schema & RLS Hardening Migration
-- Fix Profiles Table Privileges & RLS Policies
-- Migration Timestamp: 20260814140000

-- ==================================================
-- 1. GRANT TABLE-LEVEL DCL PRIVILEGES TO AUTHENTICATED ROLE
-- ==================================================
-- In PostgreSQL, RLS policy evaluation requires underlying table-level
-- privileges (SELECT, INSERT, UPDATE) for the authenticated role.

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Ensure PUBLIC and anon roles have NO privileges on public.profiles
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;

-- ==================================================
-- 2. HARDEN PROFILES RLS POLICIES
-- ==================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow authenticated users to view profiles (required for social feed, friends, leaderboard)
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own profile matching auth.uid()
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update ONLY their own profile matching auth.uid()
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
