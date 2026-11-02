-- ==============================================================================
-- Migration: 20250101000001_security_rls.sql
-- Project: Aura Attire Sample E-Commerce
-- Description: Complete Row Level Security (RLS) policies for all 5 tables
-- ==============================================================================

-- 1. Helper function: Determine if authenticated user has 'admin' role
-- SECURITY DEFINER allows evaluating without recursive RLS checks on profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- Table 1: profiles RLS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Read: Users can view their own profile, or admins can view all profiles
CREATE POLICY "profiles_select_policy"
    ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id OR public.is_admin()
    );

-- Update: Users can update their own profile, admins can update any profile
CREATE POLICY "profiles_update_policy"
    ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

-- Insert: Handled by handle_new_user trigger; allow authenticated users to self-insert their row
CREATE POLICY "profiles_insert_policy"
    ON public.profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

-- ==============================================================================
-- Table 2: products RLS
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Read: Public can view active products; Admins can view all products (including inactive)
CREATE POLICY "products_select_policy"
    ON public.products
    FOR SELECT
    USING (
        is_active = true OR public.is_admin()
    );

-- Insert: Only Admins can create products
CREATE POLICY "products_insert_policy"
    ON public.products
    FOR INSERT
    WITH CHECK (
        public.is_admin()
    );

-- Update: Only Admins can modify products
CREATE POLICY "products_update_policy"
    ON public.products
    FOR UPDATE
    USING (
        public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
    );

-- Delete: Only Admins can delete products
CREATE POLICY "products_delete_policy"
    ON public.products
    FOR DELETE
    USING (
        public.is_admin()
    );

-- ==============================================================================
-- Table 3: product_images RLS
-- ==============================================================================
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Read: Public read access for product images
CREATE POLICY "product_images_select_policy"
    ON public.product_images
    FOR SELECT
    USING (true);

-- Insert: Only Admins can upload product images
CREATE POLICY "product_images_insert_policy"
    ON public.product_images
    FOR INSERT
    WITH CHECK (
        public.is_admin()
    );

-- Update: Only Admins can update image metadata
CREATE POLICY "product_images_update_policy"
    ON public.product_images
    FOR UPDATE
    USING (
        public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
    );

-- Delete: Only Admins can remove product images
CREATE POLICY "product_images_delete_policy"
    ON public.product_images
    FOR DELETE
    USING (
        public.is_admin()
    );

-- ==============================================================================
-- Table 4: orders RLS
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Read: Customers can read only their own orders; Admins can read all orders
CREATE POLICY "orders_select_policy"
    ON public.orders
    FOR SELECT
    USING (
        auth.uid() = user_id OR public.is_admin()
    );

-- Insert: Customers can only insert orders for themselves with user_id = auth.uid()
CREATE POLICY "orders_insert_policy"
    ON public.orders
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

-- Update: Customers cannot change payment_status or ownership.
-- Admins can update order_status / fulfillment. Service role handles payment verification.
CREATE POLICY "orders_update_policy"
    ON public.orders
    FOR UPDATE
    USING (
        public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
    );

-- ==============================================================================
-- Table 5: order_items RLS
-- ==============================================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Read: Customers can read order items belonging to their own orders; Admins can read all
CREATE POLICY "order_items_select_policy"
    ON public.order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

-- Insert: Allowed when the associated order belongs to the customer
CREATE POLICY "order_items_insert_policy"
    ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );
