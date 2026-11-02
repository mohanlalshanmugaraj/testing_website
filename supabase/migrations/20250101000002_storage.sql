-- ==============================================================================
-- Migration: 20250101000002_storage.sql
-- Project: Aura Attire Sample E-Commerce
-- Description: Supabase Storage bucket 'product-images' configuration & access policies
-- ==============================================================================

-- 1. Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Storage RLS Policies

-- Public Read: Anyone can view product images
CREATE POLICY "product_images_storage_public_read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');

-- Admin Upload: Only authenticated users with admin role can upload
CREATE POLICY "product_images_storage_admin_insert"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'product-images' 
        AND auth.role() = 'authenticated'
        AND public.is_admin()
    );

-- Admin Update: Only admins can overwrite images
CREATE POLICY "product_images_storage_admin_update"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND public.is_admin()
    );

-- Admin Delete: Only admins can delete image objects
CREATE POLICY "product_images_storage_admin_delete"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'product-images'
        AND auth.role() = 'authenticated'
        AND public.is_admin()
    );
