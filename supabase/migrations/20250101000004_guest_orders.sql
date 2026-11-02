-- ==============================================================================
-- Migration: 20250101000004_guest_orders.sql
-- Project: Aura Attire Sample E-Commerce
-- Description: Enable guest / no-login checkout for customers
-- ==============================================================================

-- 1. Allow orders without an authenticated user_id
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update orders RLS policies to allow guest orders
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy"
    ON public.orders
    FOR INSERT
    WITH CHECK (
        user_id IS NULL OR user_id = auth.uid() OR public.is_admin()
    );

DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy"
    ON public.orders
    FOR SELECT
    USING (
        true
    );

-- 3. Update order_items RLS policies
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
CREATE POLICY "order_items_insert_policy"
    ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
        )
    );

DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
CREATE POLICY "order_items_select_policy"
    ON public.order_items
    FOR SELECT
    USING (
        true
    );
