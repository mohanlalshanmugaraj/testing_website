# Backend & Edge Functions API Documentation

This document describes the API contract, request/response structures, authorization rules, and error handling for the **Aura Attire** full-stack clothing e-commerce testing application.

---

## 1. Authentication & Headers

Protected endpoints require a standard Supabase User JWT Bearer token:

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

Roles are evaluated server-side via PostgreSQL Row Level Security (RLS) or within Edge Functions using `supabase.auth.getUser(token)`.

---

## 2. Razorpay Payment Gateway Edge Functions

Base URL: `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1`

### 2.1 Create Payment Order
Initiates a checkout order, verifies catalog inventory on the server, generates an INR order on Razorpay, and records a `Pending` database order.

- **Endpoint**: `POST /create-payment-order`
- **Auth**: Required (`Bearer <JWT>`)
- **Request Body**:
```json
{
  "items": [
    {
      "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "fullName": "Rahul Verma",
    "phone": "9876543210",
    "addressLine1": "Flat 402, Skyline Residency, MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  }
}
```

- **Response (200 OK)**:
```json
{
  "success": true,
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "razorpayOrderId": "order_NXg99128sFkl21",
  "amount": 299800,
  "currency": "INR",
  "keyId": "rzp_test_51AbCdEfGhIjKl"
}
```

- **Error Responses**:
  - `400 Bad Request`: `{"error": "Insufficient stock for 'Linen Overshirt'. Only 1 remaining."}`
  - `401 Unauthorized`: `{"error": "Missing authorization token."}`
  - `500 Server Error`: `{"error": "Razorpay credentials are missing."}`

---

### 2.2 Verify Payment Signature
Verifies the client callback response using HMAC SHA256 against `RAZORPAY_KEY_SECRET`. Upon verification, transitions order to `Paid` and updates product inventory.

- **Endpoint**: `POST /verify-payment`
- **Auth**: Required (`Bearer <JWT>`)
- **Request Body**:
```json
{
  "internalOrderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "razorpayOrderId": "order_NXg99128sFkl21",
  "razorpayPaymentId": "pay_NXgA5k291La091",
  "razorpaySignature": "9b1c73a0de1b992f44c82bcf231a403d5203f16298642738271e6261f22146e2"
}
```

- **Verification Logic (Deno Web Crypto)**:
```ts
const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
const expectedSignature = await hmacSha256(payload, RAZORPAY_KEY_SECRET);
if (expectedSignature !== razorpaySignature) {
  // Reject & mark Failed
}
```

- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment signature verified successfully. Order confirmed.",
  "orderId": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

- **Error Responses**:
  - `400 Bad Request`: `{"error": "Payment signature verification failed. Untrusted callback."}`

---

### 2.3 Razorpay Webhook
Asynchronous event receiver with raw body HMAC verification.

- **Endpoint**: `POST /razorpay-webhook`
- **Headers**: `X-Razorpay-Signature: <hmac_hex>`
- **Request Body**: Raw event payload from Razorpay
- **Supported Events**:
  - `payment.captured`: Marks order as `Paid` / `Confirmed` idempotently.
  - `payment.failed`: Marks order as `Failed`.
- **Response**: `200 OK` `{"status": "ok"}`

---

## 3. Product Management APIs (Supabase REST / PostgREST)

Base URL: `https://<YOUR_PROJECT_REF>.supabase.co/rest/v1`

### 3.1 List Active Products
- **Method**: `GET /products?is_active=eq.true&select=*,product_images(*)`
- **Access**: Public / Anon
- **Response**: Array of product objects with nested image galleries.

### 3.2 List All Products (Admin)
- **Method**: `GET /products?select=*,product_images(*)&order=created_at.desc`
- **Access**: Admin only (Enforced via RLS `public.is_admin()`)

### 3.3 Create Product (Admin)
- **Method**: `POST /products`
- **Access**: Admin only
- **Request Body**:
```json
{
  "name": "Organic Cotton Poplin Shirt",
  "description": "Crisp poplin weave with mother-of-pearl buttons.",
  "price": 2199.00,
  "stock_quantity": 25,
  "category": "Shirts",
  "is_active": true
}
```

### 3.4 Update Product (Admin)
- **Method**: `PATCH /products?id=eq.<PRODUCT_UUID>`
- **Access**: Admin only

### 3.5 Delete Product (Admin)
- **Method**: `DELETE /products?id=eq.<PRODUCT_UUID>`
- **Access**: Admin only (Cascades to `product_images` table)

---

## 4. Order Management APIs

### 4.1 List Customer Orders
- **Method**: `GET /orders?user_id=eq.<USER_UUID>&select=*,order_items(*)`
- **Access**: Authenticated Customer (RLS ensures user can only see own orders)

### 4.2 List All Orders (Admin)
- **Method**: `GET /orders?select=*,profiles:user_id(id,email,full_name),order_items(*)&order=created_at.desc`
- **Access**: Admin only

### 4.3 Update Order Status (Admin)
- **Method**: `PATCH /orders?id=eq.<ORDER_UUID>`
- **Access**: Admin only
- **Request Body**:
```json
{
  "order_status": "Shipped",
  "updated_at": "2026-11-02T14:30:00Z"
}
```
