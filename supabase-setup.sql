-- IMPORTANT: Run this SQL in your Supabase Dashboard SQL Editor to fix the avatar upload error
-- The profiles table already exists with role column and RLS policies (applied via MCP)

-- Create private Storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- DROP existing policies that cause recursion
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view member avatars" ON storage.objects;
DROP POLICY IF EXISTS "Super Admin can view all avatars" ON storage.objects;

-- Simplified Policy: Users can upload their own avatar (no recursion)
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Simplified Policy: Users can view their own avatar (no recursion)
CREATE POLICY "Users can view own avatar"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Simplified Policy: Users can update their own avatar (no recursion)
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Simplified Policy: Users can delete their own avatar (no recursion)
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Note: Role-based avatar viewing is handled in the frontend application code
-- to avoid circular dependencies between Storage and Database RLS policies
