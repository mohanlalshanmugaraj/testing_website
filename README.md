# Aura Attire | Full Stack Clothing E-Commerce Sample

> **IMPORTANT**: This project is strictly for development, learning, infrastructure testing, and deployment verification. It is **NOT** a real production business. No real payments are processed.

A complete, modern clothing e-commerce sample application built to test the end-to-end application lifecycle:
- **Frontend Development & Deployment**: React 19, TypeScript, Vite, Tailwind CSS v4 on Cloudflare Pages
- **Backend API & Edge Functions**: Serverless TypeScript / Deno functions on Supabase
- **Database & Security**: Supabase PostgreSQL with strict Row Level Security (RLS) policies
- **Authentication & Roles**: Admin & Customer role-based workflows (Admin escalation strictly server-side)
- **Multi-Image Storage**: Supabase Storage bucket `product-images` (up to 5 images, max 5MB, format validation)
- **Payment Gateway**: Razorpay Test Mode with backend order creation & HMAC SHA256 signature verification
- **Free-Tier Limits**: Operational verification on 100% free hosting and database tiers

---

## Architecture Diagram

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

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Lucide Icons |
| **Backend** | Supabase Edge Functions (Deno / TypeScript), REST API architecture |
| **Database** | Supabase PostgreSQL, Supabase Auth |
| **Object Storage**| Supabase Storage (`product-images` bucket) |
| **Frontend Hosting**| Cloudflare Pages (Global CDN with free automated SSL) |
| **Payment Gateway**| Razorpay Test Mode (INR currency, HMAC SHA256 verification) |
| **Version Control**| Git & GitHub |

---

## Application Modules & Route Architecture

### 1. Customer Storefront (`/customer`) – No Login Required
- **Route**: `/customer`
- **Catalog Browsing**: Mobile-first clothing catalog with category filters, search, and sorting without needing an account.
- **Product Details & Multi-Image Gallery**: `/customer/product/:id`
- **Shopping Cart**: `/customer/cart`
- **Instant Guest Checkout**: `/customer/checkout` (Enter delivery details and pay directly via Razorpay Test Mode without logging in).
- **Track Orders**: `/customer/orders` (Tracks guest orders via localStorage or search by Order ID).

### 2. Administrative Console (`/admin`) – Login Only
- **Admin Entry**: `/admin` (Redirects to `/admin/dashboard` if authenticated, or `/admin/login` if not).
- **Admin Login**: `/admin/login` (Exclusive administrator portal).
- **Admin Dashboard**: `/admin/dashboard` (Live metrics: products, orders, customers, total revenue).
- **Product Management**: `/admin/products` & `/admin/products/new` (CRUD with 5-image upload dropzone).
- **Order Management**: `/admin/orders` (View delivery addresses, line items, update fulfillment stages).

---

## Pre-Configured Admin Credentials (Test Lab)

An administrator account has already been initialized and verified in your live database:
- **Admin Portal**: `http://localhost:5173/admin/login`
- **Email**: `admin@aura.test`
- **Password**: `Admin@123456`

---

## Quickstart (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/testing-website.git
cd testing-website
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase URL, anon key, and Razorpay Test Key ID in `.env`.

### 3. Run Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## Detailed Documentation Index

For in-depth guides and procedures, refer to the documentation files:

1. **[DATABASE_SETUP.md](DATABASE_SETUP.md)**: Database schema, table structures, RLS policies, and admin escalation SQL script.
2. **[BACKEND_SETUP.md](BACKEND_SETUP.md)**: Supabase Edge Functions (`create-payment-order`, `verify-payment`, `razorpay-webhook`) and deployment commands.
3. **[FRONTEND_SETUP.md](FRONTEND_SETUP.md)**: React components, state management contexts, Tailwind styles, and build configuration.
4. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**: Complete step-by-step instructions for deploying to Cloudflare Pages and Supabase.
5. **[RAZORPAY_SETUP.md](RAZORPAY_SETUP.md)**: Razorpay Test Mode setup, HMAC signature verification, and test card credentials.
6. **[FREE_TIER_USAGE.md](FREE_TIER_USAGE.md)**: Quotas, rate limits, inactivity policies, and cost analysis for free tiers.
7. **[TESTING.md](TESTING.md)**: Comprehensive manual testing checklist for all workflows.
8. **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**: REST and Edge Function endpoints with JSON request/response examples.
9. **[.env.example](.env.example)**: Environment variables template for frontend and backend secrets.

---

## License

This sample project is distributed under the MIT License for educational, learning, and testing purposes.
