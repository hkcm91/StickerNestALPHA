-- Setup Assets Storage Bucket and RLS Policies
-- Description: Creates the 'assets' bucket and configures security policies for user uploads.

-- 1. Create the 'assets' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the 'assets' bucket
-- Note: 'storage.objects' table holds the metadata for files in all buckets.

-- A. Allow public access to all assets (read-only)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'assets' );

-- B. Allow authenticated users to upload files to their own gallery folder
-- Path format: gallery/user_id/filename
CREATE POLICY "User Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assets' AND
    (storage.foldername(name))[1] = 'gallery' AND
    (storage.foldername(name))[2] = (select auth.uid()::text)
);

-- C. Allow authenticated users to delete their own files
CREATE POLICY "User Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'assets' AND
    (storage.foldername(name))[1] = 'gallery' AND
    (storage.foldername(name))[2] = (select auth.uid()::text)
);

-- D. Allow authenticated users to update their own files (overwrite)
CREATE POLICY "User Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'assets' AND
    (storage.foldername(name))[1] = 'gallery' AND
    (storage.foldername(name))[2] = (select auth.uid()::text)
);
