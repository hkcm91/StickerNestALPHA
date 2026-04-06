-- ============================================================================
-- ALLOW AUTHENTICATED USERS TO READ BASIC PROFILES
-- ============================================================================
-- Required for messaging (conversation list), presence, and social features.
-- The users table contains only non-sensitive fields (id, email, display_name,
-- avatar_url, tier, metadata, timestamps), so broad authenticated read is safe.

CREATE POLICY "Authenticated users can read basic profiles" ON users
    FOR SELECT
    TO authenticated
    USING (true);
