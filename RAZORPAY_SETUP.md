# Razorpay Test Mode Integration Guide

This guide details the Razorpay Test Mode architecture, security controls, test cards/UPI handles, and edge scenario verification for the **Aura Attire** clothing e-commerce testing application.

Official Documentation: [Razorpay Test Integration Docs](https://razorpay.com/docs/payments/payment-gateway/test-integration/)

---

## 1. Test Mode Security Principles

> [!CAUTION]
> **STRICT TEST MODE ONLY**: Do NOT activate Live Mode or submit production banking documentation. No real currency is ever transferred or debited.

### Critical Security Rules:
1. **Never Expose Key Secret**: The Razorpay Key Secret (`RAZORPAY_KEY_SECRET`) and Webhook Secret (`RAZORPAY_WEBHOOK_SECRET`) must **NEVER** appear in frontend code, client bundles, or public repositories.
2. **Backend Order Creation**: The order must always be initiated by the backend Edge Function (`create-payment-order`) to validate live inventory and enforce exact server prices.
3. **Backend Signature Verification**: Orders are **never** marked as `Paid` based on client success callbacks alone. Verification is completed by generating an HMAC SHA256 digest on the server using `crypto.subtle` and matching against `razorpay_signature`.
4. **Idempotency**: Duplicate payment callbacks or webhooks are checked to prevent duplicate inventory deductions.

---

## 2. API Keys & Configuration

| Variable | Scope | Location | Example |
|---|---|---|---|
| `VITE_RAZORPAY_KEY_ID` | Public / Frontend | `.env` or Cloudflare Pages | `rzp_test_51AbCdEfGhIjKl` |
| `RAZORPAY_KEY_ID` | Private / Backend | Supabase Edge Function Secrets | `rzp_test_51AbCdEfGhIjKl` |
| `RAZORPAY_KEY_SECRET` | Private / Backend | Supabase Edge Function Secrets | `k3yS3cr3tXyZ1234567890` |
| `RAZORPAY_WEBHOOK_SECRET` | Private / Backend | Supabase Edge Function Secrets | `whsec_aura_test_2026` |

---

## 3. Test Credentials for Payment Simulation

When the Razorpay checkout window opens in Test Mode, you can use the following test payment instruments:

### A. Test Cards
- **Card Number**: `4111 1111 1111 1111` (or any valid test card listed in Razorpay docs)
- **Expiry Date**: Any future date (e.g. `12/30`)
- **Cardholder Name**: Any name (e.g. `Test Customer`)
- **CVV**: Any 3 digits (e.g. `123`)
- **OTP Screen**: Razorpay Test Mode will present a test simulator screen. Click **Success** or **Failure** to test both flows.

### B. Test UPI
- **UPI ID**: `success@razorpay` (Simulates instant payment success)
- **UPI ID**: `failure@razorpay` (Simulates instant payment decline)

### C. Test NetBanking
- Select any simulated bank (e.g. **HDFC Bank**, **ICICI Bank**, **SBI**).
- On the mock bank portal, click **Success** or **Fail**.

---

## 4. Testing Required Payment Scenarios

### Scenario 1: Successful Test Payment
1. Add any available product to the cart.
2. Go to `/checkout` and submit the delivery address.
3. Click **Pay via Razorpay**.
4. In the test modal, select **Card** -> enter `4111 1111 1111 1111`.
5. On the test OTP screen, click **Success**.
6. **Expected Outcome**:
   - Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
   - Frontend invokes `verify-payment` Edge Function.
   - Server verifies HMAC SHA256 signature against `RAZORPAY_KEY_SECRET`.
   - Order status in PostgreSQL becomes `Confirmed`, payment status becomes `Paid`.
   - Product stock in database is decremented by the purchased quantity.
   - Customer is redirected to `/my-orders` showing the green **Paid** badge and order summary.

### Scenario 2: Failed Test Payment
1. In the Razorpay modal, select **UPI** and enter `failure@razorpay`, or select Card and click **Failure** on the test OTP prompt.
2. **Expected Outcome**:
   - Razorpay triggers the `payment.failed` event.
   - Frontend captures the error and displays a clear message to the customer.
   - The order remains `Pending` or is marked `Failed`.
   - Product inventory is **not** decremented.

### Scenario 3: User Dismissed / Cancelled Payment
1. Open the Razorpay test modal.
2. Click the `X` button on the top right to close without paying.
3. **Expected Outcome**:
   - The `ondismiss` modal callback triggers.
   - Checkout button is re-enabled with no errors.
   - Cart items remain intact so the customer can try again.

### Scenario 4: Invalid Payment Signature
1. If a malicious client attempts to forge a payment response with a tampered signature:
2. The `verify-payment` Edge Function calculates `HMAC_SHA256(order_id + "|" + payment_id, secret)`.
3. The expected digest does not match the received signature.
4. **Expected Outcome**:
   - Server rejects the request with HTTP 400.
   - Order is marked `Failed`.
   - Inventory is protected from unauthorized deductions.

### Scenario 5: Duplicate Payment Callback / Idempotency
1. If a network retry triggers `verify-payment` multiple times for the same order:
2. The function checks `order.payment_status === 'Paid'`.
3. **Expected Outcome**:
   - Server immediately returns HTTP 200 with `{ message: "Order already verified and marked as Paid." }`.
   - Product inventory is **not** double-decremented.

### Scenario 6: Webhook Verification
1. Configure webhook URL in Razorpay Dashboard:
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
2. In Razorpay Dashboard -> **Webhooks**, click **Send Test Webhook**.
3. Select `payment.captured`.
4. **Expected Outcome**:
   - Edge Function verifies `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` using raw request text.
   - Function logs `Verified Razorpay webhook event received: payment.captured`.
   - Database order is confirmed if not already processed.
