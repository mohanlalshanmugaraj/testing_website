# Comprehensive Testing & QA Checklist

This document provides a systematic verification checklist for validating all frontend, backend, security, database, and payment features of the **Aura Attire** full-stack e-commerce application.

---

## 1. Authentication & Role-Based Access Control

- [ ] **Customer Signup (Strict Role Enforcement)**:
  - Open `/signup`.
  - Enter Full Name, Email, Password (>= 6 chars), and Confirm Password.
  - Click "Create Account". Verify user is created.
  - In Supabase SQL editor: `SELECT role FROM public.profiles WHERE email = '...'`.
  - Confirm role is strictly `'customer'`.
- [ ] **Duplicate Email Registration**:
  - Attempt to sign up again with the same email.
  - Verify error message: *"An account with this email address already exists"*.
- [ ] **Invalid Password Handling**:
  - Attempt to sign in with an incorrect password.
  - Verify error message: *"Failed to sign in. Please verify your credentials"*.
- [ ] **Customer Login & Session Persistence**:
  - Sign in with customer credentials. Verify navigation header displays customer's name and email.
  - Refresh the browser; confirm session persists without requiring re-login.
- [ ] **Customer Logout**:
  - Click logout button in the navbar.
  - Confirm user session clears and nav returns to unauthenticated state.
- [ ] **Access Restriction to Admin Dashboard**:
  - While logged in as a Customer, manually enter `/admin` in the browser address bar.
  - Verify page is blocked with *"Access Restricted: This area requires administrative privileges"* and redirects to `/`.
- [ ] **Role Tampering Prevention (Database Trigger Guard)**:
  - Attempt updating a customer's role via the client Supabase SDK:
    ```js
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    ```
  - Verify database trigger raises an exception: *"Security Violation: You do not possess permission to modify user roles"*.
- [ ] **Admin Login & Dashboard Navigation**:
  - Elevate user via SQL: `UPDATE public.profiles SET role = 'admin' WHERE email = '...';`
  - Re-login as Admin. Verify "Admin Panel" link appears in the navbar.
  - Navigate to `/admin`. Verify dashboard metrics load successfully.

---

## 2. Product Management (Admin & Customer)

- [ ] **Admin Creates Product**:
  - Navigate to `/admin/products/new`.
  - Enter Name, Description, Category, Price (e.g. ₹1,899.00), and Stock (e.g. 20).
  - Submit form. Verify product appears in `/admin/products`.
- [ ] **Multiple Image Upload (Max 5 Images, Max 5MB Each)**:
  - Upload 2-3 JPG/PNG images to the dropzone.
  - Verify image previews appear with removal buttons (`X`).
  - Verify upload progress indicator displays during submission.
  - Check Supabase Storage bucket `product-images`; verify images exist under `products/{id}/{timestamp}_{name}`.
  - Check PostgreSQL table `product_images`; verify rows reference the product ID.
- [ ] **Image Validation**:
  - Attempt uploading a non-image file (e.g. `.pdf` or `.txt`). Verify file is rejected.
  - Attempt uploading a file > 5 MB. Verify file is rejected.
  - Attempt uploading more than 5 images. Verify limit warning.
- [ ] **Admin Updates Product Details**:
  - Click "Edit" on a product.
  - Modify price or stock count. Save.
  - Verify updated price and stock reflect in the catalog.
- [ ] **Admin Toggles Active Status**:
  - Click the "Active" pill toggle on a product row to set it "Inactive".
  - Open customer storefront at `/` in incognito. Verify inactive product is hidden.
  - In Admin view, verify product remains visible with "Inactive" badge.
- [ ] **Admin Deletes Product**:
  - Click delete on a product and confirm prompt.
  - Verify product is removed from table.
  - Verify attached storage objects are cleaned up from `product-images` bucket.
- [ ] **Customer Read-Only Access**:
  - Log in as customer. Attempt running an insert on products:
    ```js
    await supabase.from('products').insert({ name: 'Hack', price: 10 });
    ```
  - Verify Row Level Security rejects request with a policy error.

---

## 3. Shopping Cart & Inventory Checkout

- [ ] **Add to Cart**:
  - In product catalog, click "Add to Cart". Verify floating cart counter increments.
  - Go to `/product/:id`. Select quantity (e.g. 3) and click "Add to Cart".
- [ ] **Quantity & Stock Boundary Controls**:
  - In cart, increment quantity up to available stock. Verify further incrementing is disabled once stock is reached.
  - Decrement quantity to 0 or click trash icon; verify item is removed.
- [ ] **Subtotal and Total Calculations**:
  - Add multiple products with different prices and quantities.
  - Verify subtotal and total calculations match unit price * quantity.
- [ ] **Server-Side Price & Stock Pre-Validation**:
  - Place items in cart.
  - In another tab (as admin), change product price or reduce stock to 0.
  - Return to checkout and click "Pay via Razorpay".
  - Verify checkout halts with an informative error (*"Product is no longer available"* or *"Insufficient stock remaining"*).
- [ ] **Customer Order Isolation (RLS)**:
  - Verify Customer A can only see their own orders in `/my-orders`.
  - Attempt querying Customer B's order:
    ```js
    await supabase.from('orders').select('*').eq('id', otherOrderId);
    ```
  - Verify RLS returns 0 records.

---

## 4. Razorpay Test Mode Gateway

- [ ] **Test Order Creation**:
  - Verify order is created on backend Edge Function `create-payment-order` with INR currency.
  - Verify Razorpay order ID begins with `order_`.
  - Verify database record created with status `Pending`.
- [ ] **Payment Simulation (Success)**:
  - Enter test card `4111 1111 1111 1111` with any future expiry date and CVV.
  - On test OTP screen, click **Success**.
  - Verify `verify-payment` Edge Function calculates valid HMAC SHA256 signature.
  - Verify order updates to `payment_status = 'Paid'` and `order_status = 'Confirmed'`.
  - Verify product stock in PostgreSQL decrements by the ordered quantity.
  - Verify customer is redirected to `/my-orders` with green **Paid** badge.
- [ ] **Payment Simulation (Failure)**:
  - In Razorpay modal, select UPI and enter `failure@razorpay` or click **Failure** on OTP prompt.
  - Verify modal reports failure and checkout displays error notice.
  - Verify product inventory is not deducted.
- [ ] **Cancelled Payment (Modal Dismissed)**:
  - Open Razorpay modal and click the `X` button.
  - Verify checkout button is restored with no crash.
- [ ] **Invalid Signature Rejection**:
  - Send tampered signature to `verify-payment`.
  - Verify server rejects with HTTP 400 and does not mark order as Paid.
- [ ] **Idempotent Duplicate Callback**:
  - Call `verify-payment` twice with the same valid payload.
  - Verify second invocation succeeds without double-decrementing stock.
- [ ] **Webhook Verification**:
  - Send test `payment.captured` event from Razorpay Dashboard.
  - Verify Edge Function confirms raw body signature and updates order.

---

## 5. Deployment & Production Verification

- [ ] **Cloudflare Pages Static Build**:
  - Verify `npm run build` succeeds in CI/CD pipeline with exit code 0.
  - Verify site is accessible over HTTPS with zero mixed-content errors.
- [ ] **SPA Client Routing**:
  - Refresh deep links such as `/cart`, `/my-orders`, and `/admin/products`.
  - Verify `public/_redirects` prevents 404 errors.
- [ ] **No Frontend Secret Leakage**:
  - Inspect production bundle in browser dev tools (Sources/Network).
  - Verify `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are not present anywhere in client JavaScript.
- [ ] **Free-Tier Limits Check**:
  - Verify database size, storage usage, and Edge Function invocation counts remain within free allowances.
