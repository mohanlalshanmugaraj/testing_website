# Free-Tier Usage & Cost Analysis

This document evaluates the operational feasibility, quotas, boundaries, and restrictions of hosting the **Aura Attire** full-stack e-commerce sample entirely within **free-tier services**.

---

## 1. Executive Summary

| Service | Role | Free Tier Quota | Sufficient for Testing & Portfolio? |
|---|---|---|---|
| **Supabase** | PostgreSQL, Auth, Storage, Edge Functions | 500 MB DB, 1 GB Storage, 500k Function Calls, 50k MAU | **YES** (~10,000+ products, ~50,000 orders) |
| **Cloudflare Pages** | React 19 Frontend Hosting & Global CDN | Unlimited bandwidth, 500 builds/month, Free SSL | **YES** (Zero bandwidth fees) |
| **Razorpay** | Payment Gateway (Test Mode) | Unlimited Test Transactions | **YES** (Zero financial transactions) |
| **Total Cost** | **Infrastructure & Payments** | **₹0.00 / $0.00 per month** | **100% Free** |

---

## 2. Supabase Free Tier Analysis

Official Documentation: [Supabase Pricing](https://supabase.com/pricing)

### Quotas & Allocations:
- **Database Size**: **500 MB**
  - Schema storage consumption: ~10 MB for core tables and extensions.
  - Typical product row: ~0.5 KB -> 10,000 products consume only ~5 MB.
  - Typical order row with line items: ~1 KB -> 50,000 orders consume ~50 MB.
- **File Storage**: **1 GB**
  - Average compressed clothing product image: ~200 KB.
  - 1 GB accommodates **~5,000 high-resolution clothing images** in the `product-images` bucket.
- **Bandwidth / Egress**: **5 GB / month**
  - Adequate for testing, reviews, and continuous QA.
- **Monthly Active Users (MAU)**: **50,000 MAU**
  - Customer accounts authenticated via Supabase Auth (GoTrue).
- **Edge Function Invocations**: **500,000 invocations / month**
  - Checkout order creation and signature verification invocations consume < 0.1% of this quota during active testing.

### Key Free-Tier Restrictions & Mitigations:
1. **Inactivity Pausing**:
   - *Restriction*: Projects on the Free tier that receive no database or API queries for **7 consecutive days** are automatically paused to conserve idle compute.
   - *Mitigation*: You can restore a paused project in 1 click from the Supabase Dashboard. Alternatively, setting up a weekly health check or visiting the site prevents pausing.
2. **Backups**:
   - *Restriction*: Point-in-time recovery (PITR) is a Pro feature. Free tier retains automated daily backups for 7 days.
   - *Mitigation*: You can export a full database dump anytime using `pg_dump` or the Supabase CLI:
     ```bash
     npx supabase db dump -f backup.sql
     ```
3. **Database Connections**:
   - Direct connection limit: ~15 connections.
   - Connection pooler (Supavisor on port 6543): Supports up to 200 pooled client connections.

---

## 3. Cloudflare Pages Free Tier Analysis

Official Documentation: [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)

### Quotas & Allocations:
- **Bandwidth & Requests**: **UNLIMITED** (Zero egress bandwidth charges globally).
- **Build Limits**: **500 builds / month**
  - Ample for active feature branches, pull request previews, and production deployments.
- **File Limitations**:
  - Maximum **20,000 files** per deployment. (Our React app builds to ~5 static files in `dist/`).
  - Maximum individual static file size: **25 MB**. (Our single JS bundle is < 600 KB).
- **Custom Domains & SSL**: **Unlimited custom domains** with free, automated SSL/TLS certificates issued by Cloudflare.
- **Global Network**: Served from Cloudflare's edge data centers across 300+ cities worldwide.

---

## 4. Razorpay Test Mode Analysis

Official Documentation: [Razorpay Test Integration](https://razorpay.com/docs/payments/payment-gateway/test-integration/)

### Quotas & Allocations:
- **Test Mode Fee**: **₹0.00** (Free forever).
- **Setup & Maintenance Fees**: **None**.
- **Transaction Limits**: No transaction caps in Test Mode.
- **Settlements**: In Test Mode, no actual banking transactions or settlements occur. All balances and transactions are simulated in the sandbox.
- **Compliance**: No merchant KYC or GST certificate required to test full payment flows and webhooks.

---

## 5. Alternative Storage: Cloudinary (Optional Comparison)

Official Documentation: [Cloudinary Pricing](https://cloudinary.com/pricing)

If you prefer using an external digital asset management service instead of Supabase Storage:
- **Free Allowance**: **25 monthly credits**.
- **Credit Consumption**:
  - 1 Credit = 1 GB of managed storage, OR
  - 1 Credit = 1 GB of net egress bandwidth, OR
  - 1 Credit = 1,000 transformations (cropping, format conversion).
- *Recommendation*: For this sample project, **Supabase Storage** is strongly recommended because it integrates natively with PostgreSQL Row Level Security policies and avoids managing two separate vendor SDKs.
