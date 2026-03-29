-- Setup Generated Images Storage Bucket and RLS Policies
-- Description: Creates the 'generated-images' bucket for AI-generated image uploads.
-- Path convention: generated-images/{userId}/{uuid}.{ext}

-- 1. Create the 'generated-images' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the 'generated-images' bucket

-- A. Allow public read access (generated images are viewable by anyone on the canvas)
CREATE POLICY "Generated Images Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated-images' );

-- B. Allow authenticated users to upload to their own folder
CREATE POLICY "Generated Images User Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'generated-images' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- C. Allow authenticated users to update (overwrite) their own files
CREATE POLICY "Generated Images User Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'generated-images' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- D. Allow authenticated users to delete their own files
CREATE POLICY "Generated Images User Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'generated-images' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
);
