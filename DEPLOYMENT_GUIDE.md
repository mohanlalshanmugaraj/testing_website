# Full Stack Deployment Guide: Cloudflare Pages + Supabase + Razorpay Test

This guide provides end-to-end deployment instructions using **100% free-tier services**.

---

## Architecture Overview

```
[ Customer / Admin Browser ]
            |
            | HTTPS
            v
[ Cloudflare Pages (Frontend CDN) ] ---> React 19 + Vite SPA (dist/)
            |
            | Supabase JS SDK (HTTPS)
            v
[ Supabase Free Tier ]
   ├── Authentication (GoTrue email/password)
   ├── PostgreSQL Database (Profiles, Products, Orders with RLS)
   ├── Storage ('product-images' bucket)
   └── Edge Functions (Deno runtime)
            |
            | REST / HTTPS
            v
[ Razorpay Test Mode ]
   ├── Order Creation API
   └── HMAC SHA256 Signature Verification
```

---

## Step 1: Git & GitHub Setup

Initialize Git repository and push your project to GitHub:

```bash
# 1. Initialize git
git init

# 2. Add files
git add .

# 3. Create initial commit
git commit -m "feat: complete clothing e-commerce app with Supabase, Razorpay test mode, and admin panel"

# 4. Create repository on GitHub and push
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/testing-website.git
git push -u origin main
```

> [!NOTE]
> `.gitignore` already excludes `node_modules`, `dist`, `.env`, and private files. Ensure `.env.example` remains committed as the template.

---

## Step 2: Supabase Setup (Database, Auth, Storage)

1. Sign up or log in at [supabase.com](https://supabase.com/).
2. Click **New Project**:
   - **Name**: `Aura Attire Test`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Choose `South Asia (Mumbai)` for optimal latency with Indian users, or nearest available free region.
   - **Pricing Plan**: **Free**.
3. Once the project finishes provisioning (takes ~1-2 minutes):
   - Go to **Project Settings** -> **API**.
   - Copy **Project URL** (e.g. `https://xyzcompany.supabase.co`).
   - Copy **anon public** key (`eyJhbGciOi...`).
4. Apply Database Migrations:
   - Click **SQL Editor** in the left sidebar.
   - Open and run the migration scripts from your repository:
     1. `supabase/migrations/20250101000000_schema.sql` (Creates tables, indexes, triggers)
     2. `supabase/migrations/20250101000001_security_rls.sql` (Enables RLS on all 5 tables)
     3. `supabase/migrations/20250101000002_storage.sql` (Configures `product-images` bucket)
     4. `supabase/migrations/20250101000003_seed_data.sql` (Populates sample clothing products)
5. Configure Authentication:
   - Go to **Authentication** -> **Providers** -> **Email**.
   - Make sure Email provider is **Enabled**.
   - For rapid testing, you may optionally disable "Confirm email" under **Email Auth** if you want test accounts to log in immediately without checking an inbox.

---

## Step 3: Backend Deployment (Supabase Edge Functions)

Install the Supabase CLI on your development machine or run via `npx`:

```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Link your local project
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Configure backend secrets
npx supabase secrets set \
  RAZORPAY_KEY_ID="rzp_test_YourKeyId" \
  RAZORPAY_KEY_SECRET="YourKeySecret" \
  RAZORPAY_WEBHOOK_SECRET="YourWebhookSecret"

# 4. Deploy all three Edge Functions
npx supabase functions deploy create-payment-order --no-verify-jwt
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy razorpay-webhook --no-verify-jwt
```

---

## Step 4: Razorpay Test Mode Setup

1. Create a free account at [razorpay.com](https://razorpay.com/).
2. Once logged in, ensure the toggle at the top left indicates **Test Mode**.
3. Generate API Keys:
   - Go to **Account & Settings** -> **API Keys**.
   - Click **Generate Test Key**.
   - Copy **Key ID** (`rzp_test_...`) and **Key Secret**.
4. Configure Webhooks:
   - Go to **Account & Settings** -> **Webhooks**.
   - Click **Add New Webhook**.
   - **Webhook URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
   - **Secret**: Enter a secure random string (e.g. `whsec_aura_test_2026`).
   - **Active Events**: Check `payment.captured` and `payment.failed`.
   - Click **Save**.
5. Save the Webhook Secret in your Supabase Edge Function secrets as shown in Step 3.

---

## Step 5: Frontend Deployment on Cloudflare Pages

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the sidebar, select **Compute (Workers) -> Workers & Pages** (or **Pages**).
3. Click **Create Application** -> Select **Pages** tab -> **Connect to Git**.
4. Authorize GitHub and select your repository (`testing-website`).
5. Configure Build & Deployment Settings:
   - **Project name**: `aura-attire-store`
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Add Environment Variables (expand **Environment variables** section):
   - `VITE_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOi...` (Your Supabase anon key)
   - `VITE_RAZORPAY_KEY_ID` = `rzp_test_...` (Your Razorpay Test Key ID)
7. Click **Save and Deploy**.
8. Cloudflare will clone your repository, run `npm install`, execute `npm run build`, and assign a free global HTTPS subdomain:
   `https://aura-attire-store.pages.dev`

---

## Step 6: Post-Deployment Verification

1. Open your deployed Cloudflare Pages URL (`https://your-site.pages.dev`).
2. Register a customer account at `/signup`.
3. Elevate that account to Admin in the Supabase SQL Editor:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
4. Log back in and navigate to `/admin`:
   - Verify metrics cards show live counts from Supabase.
   - Go to **Product Management** -> **Add New Product**.
   - Upload multiple clothing images to Supabase Storage bucket `product-images`.
   - Confirm images appear in both admin and customer views.
5. In an incognito browser, open the home page as a customer:
   - Browse the catalog.
   - Add items to the cart.
   - Proceed to checkout and enter shipping details.
   - Click **Pay via Razorpay**.
   - In the Razorpay modal, select **Card** or **UPI** in Test Mode.
   - Select **Success**.
   - Confirm order is verified and appears under **My Orders** with status `Paid` and `Confirmed`.
   - In the Admin panel, confirm the order shows up under **Customer Orders** and the total revenue metric updates.
