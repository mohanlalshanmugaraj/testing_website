-- ==============================================================================
-- Migration: 20250101000003_seed_data.sql
-- Project: Aura Attire Sample E-Commerce
-- Description: Seed catalog with sample clothing products and multi-image galleries
-- ==============================================================================

-- Clear existing sample data if re-running
DELETE FROM public.products WHERE name IN (
    'Relaxed Fit Heavyweight Linen Overshirt',
    'Mercerized Supima Cotton Crewneck',
    'Structured Wool-Blend Overcoat',
    'Pleated Tailored Wool Trousers',
    'Textured Fisherman Rib Knit Sweater',
    'Minimalist Leather Minimalist Belt'
);

DO $$
DECLARE
    p1_id UUID := gen_random_uuid();
    p2_id UUID := gen_random_uuid();
    p3_id UUID := gen_random_uuid();
    p4_id UUID := gen_random_uuid();
    p5_id UUID := gen_random_uuid();
    p6_id UUID := gen_random_uuid();
BEGIN
    -- Product 1: Linen Overshirt
    INSERT INTO public.products (id, name, description, price, stock_quantity, category, is_active)
    VALUES (
        p1_id,
        'Relaxed Fit Heavyweight Linen Overshirt',
        'Crafted from 100% Normandy flax linen. Features dual chest pockets, horn buttons, and a relaxed dropped-shoulder silhouette perfect for year-round layering.',
        2499.00,
        18,
        'Shirts',
        true
    );

    INSERT INTO public.product_images (product_id, image_path, image_url, display_order)
    VALUES 
        (p1_id, 'seed/overshirt_1.jpg', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', 0),
        (p1_id, 'seed/overshirt_2.jpg', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', 1);

    -- Product 2: Supima Cotton Crewneck
    INSERT INTO public.products (id, name, description, price, stock_quantity, category, is_active)
    VALUES (
        p2_id,
        'Mercerized Supima Cotton Crewneck',
        'Silky-smooth 240 GSM long-staple Supima cotton with a slight luster. Pre-shrunk finish and reinforced ribbed collar that maintains its shape after washing.',
        1299.00,
        35,
        'T-Shirts',
        true
    );

    INSERT INTO public.product_images (product_id, image_path, image_url, display_order)
    VALUES 
        (p2_id, 'seed/tshirt_1.jpg', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', 0),
        (p2_id, 'seed/tshirt_2.jpg', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80', 1);

    -- Product 3: Wool-Blend Overcoat
    INSERT INTO public.products (id, name, description, price, stock_quantity, category, is_active)
    VALUES (
        p3_id,
        'Structured Wool-Blend Overcoat',
        'Tailored with 70% virgin wool and durable technical fibers for wind protection. Double-breasted closure, satin lining, and deep welt pockets in rich charcoal.',
        5999.00,
        12,
        'Jackets',
        true
    );

    INSERT INTO public.product_images (product_id, image_path, image_url, display_order)
    VALUES 
        (p3_id, 'seed/overcoat_1.jpg', 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=800&q=80', 0),
        (p3_id, 'seed/overcoat_2.jpg', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80', 1);

    -- Product 4: Pleated Wool Trousers
    INSERT INTO public.products (id, name, description, price, stock_quantity, category, is_active)
    VALUES (
        p4_id,
        'Pleated Tailored Wool Trousers',
        'Modern wide-taper silhouette with a single front pleat, hidden waistband adjusters, and blind-stitched cuffs. High-waisted architectural drape.',
        3199.00,
        22,
        'Trousers',
        true
    );

    INSERT INTO public.product_images (product_id, image_path, image_url, display_order)
    VALUES 
        (p4_id, 'seed/trousers_1.jpg', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80', 0);

    -- Product 5: Rib Knit Sweater
    INSERT INTO public.products (id, name, description, price, stock_quantity, category, is_active)
    VALUES (
        p5_id,
        'Textured Fisherman Rib Knit Sweater',
        'Chunky 5-gauge knit spun from soft lambswool yarn. Warm, breathable, and finished with a comfortable crew neckline and raglan shoulders.',
        3799.00,
        15,
        'Knitwear',
        true
    );

    INSERT INTO public.product_images (product_id, image_path, image_url, display_order)
    VALUES 
        (p5_id, 'seed/sweater_1.jpg', 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80', 0);

    -- Product 6: Minimalist Leather Belt
    INSERT INTO public.products (id, name, description, price, stock_quantity, category, is_active)
    VALUES (
        p6_id,
        'Minimalist Leather Minimalist Belt',
        'Handcrafted from full-grain vegetable-tanned bridle leather with a brushed nickel buckle. Beveled edges with burnished finish.',
        899.00,
        40,
        'Accessories',
        true
    );

    INSERT INTO public.product_images (product_id, image_path, image_url, display_order)
    VALUES 
        (p6_id, 'seed/belt_1.jpg', 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80', 0);

END $$;

-- ==============================================================================
-- HOW TO CREATE / ELEVATE YOUR FIRST ADMIN USER SECURELY:
-- ==============================================================================
-- 1. Sign up a new customer account through the web interface (e.g. admin@aura.test).
-- 2. Open the Supabase SQL Editor and execute:
--
--    UPDATE public.profiles
--    SET role = 'admin'
--    WHERE email = 'admin@aura.test';
--
-- 3. Log out and log back in on the website. The Admin Panel button will now be active!
