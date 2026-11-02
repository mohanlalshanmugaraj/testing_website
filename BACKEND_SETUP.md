# Backend Setup & Edge Functions Guide

This guide describes how to configure, test, and deploy the Supabase Edge Functions powering the backend API for the **Aura Attire** e-commerce testing application.

---

## 1. Overview of Backend Architecture

The backend consists of serverless TypeScript functions running on the **Deno** runtime inside Supabase Edge Functions.

| Function Name | Route | Purpose | Authorization |
|---|---|---|---|
| `create-payment-order` | `/functions/v1/create-payment-order` | Validates live catalog prices & inventory on server, computes exact INR paise, generates Razorpay order, and records pending database order. | Authenticated Customer (`Bearer <JWT>`) |
| `verify-payment` | `/functions/v1/verify-payment` | Computes HMAC SHA256 signature using `RAZORPAY_KEY_SECRET`, verifies against client callback, updates order to `Paid`, and decrements inventory atomically. | Authenticated Customer |
| `razorpay-webhook` | `/functions/v1/razorpay-webhook` | Asynchronous backup handler for Razorpay webhooks (`payment.captured`, `payment.failed`) with raw request body signature verification. | Razorpay Server (`X-Razorpay-Signature`) |

---

## 2. Directory Structure

```
supabase/
├── config.toml
└── functions/
    ├── _shared/
    │   └── cors.ts                      # Standard CORS headers
    ├── create-payment-order/
    │   └── index.ts                     # Order creation endpoint
    ├── verify-payment/
    │   └── index.ts                     # HMAC verification endpoint
    └── razorpay-webhook/
        └── index.ts                     # Webhook handler
```

---

## 3. Configuring Backend Secrets

> [!WARNING]
> Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in frontend `.env` files or commit them to Git.

Set these secrets on your Supabase project using the Supabase CLI:

```bash
npx supabase secrets set \
  RAZORPAY_KEY_ID="rzp_test_YourKeyIdHere" \
  RAZORPAY_KEY_SECRET="YourKeySecretHere" \
  RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"
```

To verify currently set secrets (values are hidden for security):
```bash
npx supabase secrets list
```

---

## 4. Deploying Edge Functions

### Step 1: Link Your Project
```bash
# Login to Supabase CLI
npx supabase login

# Link your project reference (found in Supabase Dashboard -> Project Settings -> General)
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Deploy Each Function
```bash
# 1. Deploy create-payment-order
npx supabase functions deploy create-payment-order --no-verify-jwt

# 2. Deploy verify-payment
npx supabase functions deploy verify-payment --no-verify-jwt

# 3. Deploy razorpay-webhook
npx supabase functions deploy razorpay-webhook --no-verify-jwt
```

> [!NOTE]
> We pass `--no-verify-jwt` at the gateway level because our code explicitly verifies the JWT inside the function handler using `supabase.auth.getUser(token)` and handles anonymous webhook callbacks for the Razorpay webhook.

---

## 5. Monitoring & Viewing Logs

To stream live logs from deployed functions during testing:

```bash
npx supabase functions logs create-payment-order
npx supabase functions logs verify-payment
npx supabase functions logs razorpay-webhook
```

You can also view function invocations, metrics, and execution times under **Supabase Dashboard** -> **Edge Functions**.

---

## 6. Testing Endpoints Locally (Optional)

To test Edge Functions locally with Deno:

```bash
# Start local Supabase container (requires Docker)
npx supabase start

# Serve functions locally
npx supabase functions serve --env-file .env
```
