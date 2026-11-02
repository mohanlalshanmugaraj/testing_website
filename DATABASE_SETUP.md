# Database Setup & SQL Migrations Guide

This document details the database architecture, schema migrations, Row Level Security (RLS) policies, and administrative escalation procedures for the **Aura Attire** clothing e-commerce testing application.

---

## 1. Database Architecture & Schema

The application relies on PostgreSQL hosted on Supabase with 5 relational tables:

```
+--------------------+           +-----------------------+
|   auth.users       |           |       products        |
+--------------------+           +-----------------------+
          | (1:1)                            | (1:N)
          v                                  v
+--------------------+           +-----------------------+
|     profiles       |           |    product_images     |
+--------------------+           +-----------------------+
          | (1:N)
          v
+--------------------+ (1:N)     +-----------------------+
|      orders        |<--------->|      order_items      |
+--------------------+           +-----------------------+
```

### Table 1: `profiles`
Extends `auth.users` to maintain role-based access control.
- `id` (UUID, Primary Key, references `auth.users(id)` ON DELETE CASCADE)
- `email` (TEXT, NOT NULL)
- `full_name` (TEXT)
- `role` (TEXT, CHECK IN ('admin', 'customer'), DEFAULT 'customer')
- `created_at` (TIMESTAMPTZ, DEFAULT timezone('utc', now()))
- `updated_at` (TIMESTAMPTZ, DEFAULT timezone('utc', now()))

### Table 2: `products`
Stores apparel catalog items.
- `id` (UUID, Primary Key, DEFAULT `gen_random_uuid()`)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `price` (NUMERIC(10,2), NOT NULL CHECK >= 0)
- `stock_quantity` (INTEGER, NOT NULL DEFAULT 0 CHECK >= 0)
- `category` (TEXT, NOT NULL)
- `is_active` (BOOLEAN, NOT NULL DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 3: `product_images`
Supports up to 5 showcase images per product.
- `id` (UUID, Primary Key)
- `product_id` (UUID, references `products(id)` ON DELETE CASCADE)
- `image_path` (TEXT, Storage object path in `product-images` bucket)
- `image_url` (TEXT, Public CDN URL)
- `display_order` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ)

### Table 4: `orders`
Manages customer checkouts and Razorpay references.
- `id` (UUID, Primary Key)
- `user_id` (UUID, references `profiles(id)` ON DELETE RESTRICT)
- `total_amount` (NUMERIC(10,2), NOT NULL CHECK >= 0)
- `order_status` (TEXT, CHECK IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'))
- `payment_status` (TEXT, CHECK IN ('Pending', 'Paid', 'Failed', 'Refunded'))
- `razorpay_order_id` (TEXT)
- `razorpay_payment_id` (TEXT)
- `razorpay_signature` (TEXT)
- `shipping_address` (JSONB)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### Table 5: `order_items`
Immutable historical snapshot of purchased line items.
- `id` (UUID, Primary Key)
- `order_id` (UUID, references `orders(id)` ON DELETE CASCADE)
- `product_id` (UUID, references `products(id)` ON DELETE SET NULL)
- `product_name_snapshot` (TEXT, NOT NULL)
- `quantity` (INTEGER, NOT NULL CHECK > 0)
- `unit_price` (NUMERIC(10,2), NOT NULL CHECK >= 0)
- `subtotal` (NUMERIC(10,2), NOT NULL CHECK >= 0)
- `created_at` (TIMESTAMPTZ)

---

## 2. Applying Migrations

You can run the migrations either via the **Supabase Web SQL Editor** or using the **Supabase CLI**.

### Option A: Via Supabase Web Dashboard (Recommended for Quick Setup)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and click **SQL Editor** in the left sidebar.
3. Open and run each migration in numerical order:
   - `supabase/migrations/20250101000000_schema.sql` (Tables, Triggers, Indexes)
   - `supabase/migrations/20250101000001_security_rls.sql` (Row Level Security Policies)
   - `supabase/migrations/20250101000002_storage.sql` (Storage Bucket & Storage Policies)
   - `supabase/migrations/20250101000003_seed_data.sql` (Initial Clothing Catalog)

### Option B: Via Supabase CLI
```bash
# Login to Supabase CLI
npx supabase login

# Link your local project to your remote Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

---

## 3. Mandatory Security & Row Level Security (RLS)

All 5 tables have Row Level Security enabled. Security rules are enforced at the database layer:

| Table | Policy Summary |
|---|---|
| `profiles` | Users can view & edit only their own profile. Non-admins cannot alter `role`. Admins have full access. |
| `products` | Anyone can view `is_active = true` items. Only Admins can `INSERT`, `UPDATE`, or `DELETE`. |
| `product_images` | Public read access. Only Admins can upload, modify, or remove images. |
| `orders` | Customers can view and create orders only where `user_id = auth.uid()`. Customers cannot alter payment status. Admins can view & update all orders. |
| `order_items` | Customers can read items belonging to their own orders. Admins can read all. |

### Security Definer Function: `public.is_admin()`
```sql
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
```

---

## 4. How to Create the First Admin User Securely

> [!IMPORTANT]
> Public signup will **never** grant admin access. All new users receive the `customer` role automatically.

1. Open the deployed application (or `http://localhost:5173`).
2. Go to `/signup` and create an account with your desired admin email (e.g. `admin@aura.test`).
3. Open the **Supabase Dashboard** -> **SQL Editor**.
4. Run the following command to elevate that account:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@aura.test';
```

5. Confirm the role was changed:
```sql
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'admin@aura.test';
```
6. Log out from the web app and log back in. The **Admin Panel** link will now be visible in the navigation bar!
