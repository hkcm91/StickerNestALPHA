-- Migration: Add users table INSERT policy and auto-creation trigger
-- This fixes the issue where OAuth users don't have a row in the users table

-- ============================================================================
-- ADD INSERT POLICY FOR USERS TABLE
-- ============================================================================
-- Users should be able to insert their own profile row

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- AUTO-CREATE USER ROW ON AUTH SIGNUP
-- ============================================================================
-- When a new user signs up (via OAuth or email), automatically create
-- a corresponding row in the users table

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url, tier)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'free'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- BACKFILL EXISTING AUTH USERS
-- ============================================================================
-- Create user rows for any existing auth.users that don't have one

INSERT INTO public.users (id, email, display_name, avatar_url, tier)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    raw_user_meta_data->>'avatar_url',
    'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
