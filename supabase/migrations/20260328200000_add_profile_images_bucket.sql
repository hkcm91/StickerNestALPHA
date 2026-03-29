-- Setup Profile Images Storage Bucket and RLS Policies
-- Description: Creates the 'profile-images' bucket for avatar and banner uploads.
-- Path convention: profile-images/{userId}/avatar.{ext} or banner.{ext}

-- 1. Create the 'profile-images' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the 'profile-images' bucket

-- A. Allow public read access (avatars and banners are publicly viewable)
CREATE POLICY "Profile Images Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-images' );

-- B. Allow authenticated users to upload to their own folder
CREATE POLICY "Profile Images User Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- C. Allow authenticated users to update (overwrite) their own files
CREATE POLICY "Profile Images User Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- D. Allow authenticated users to delete their own files
CREATE POLICY "Profile Images User Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
);
