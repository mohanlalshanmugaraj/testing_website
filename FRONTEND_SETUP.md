# Frontend Setup & React Application Guide

This document describes how to configure, develop, and build the React + TypeScript frontend for the **Aura Attire** clothing e-commerce testing application.

---

## 1. Technology Overview

- **Core Framework**: React 19 with TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Tailwind CSS v4 with custom responsive typography
- **Routing**: React Router v7
- **Iconography**: Lucide React
- **Backend SDK**: `@supabase/supabase-js`
- **Payment Gateway**: Razorpay Checkout.js (Test Mode)

---

## 2. Directory Structure

```
src/
├── types/
│   ├── database.types.ts       # Database models (Product, Order, Profile, etc.)
│   └── razorpay.d.ts           # Window.Razorpay type declarations
├── lib/
│   └── supabase.ts             # Supabase client singleton & configuration check
├── context/
│   ├── AuthContext.tsx         # Session state, role check (admin/customer)
│   └── CartContext.tsx         # Cart items, persistence, subtotal/total calculations
├── components/
│   ├── common/
│   │   ├── Navbar.tsx          # Responsive navigation & auth controls
│   │   ├── Footer.tsx          # Testing lab notices & stack info
│   │   ├── ProtectedRoute.tsx  # Role-based route guard
│   │   └── LoadingSpinner.tsx  # Accessible loading indicator
│   ├── customer/
│   │   ├── ProductCard.tsx     # Catalog item card with image & quick-add
│   │   └── ImageGallery.tsx    # Multi-image viewer with active thumbnail
│   └── admin/
│       └── AdminLayout.tsx     # Admin sidebar navigation
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   ├── customer/
│   │   ├── HomePage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   └── MyOrdersPage.tsx
│   └── admin/
│       ├── AdminDashboardPage.tsx
│       ├── AdminProductsPage.tsx
│       ├── AdminProductFormPage.tsx
│       └── AdminOrdersPage.tsx
├── App.tsx                     # Route hierarchy
├── main.tsx                    # React root
└── index.css                   # Tailwind v4 import & custom font rules
```

---

## 3. Local Setup & Running Locally

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase project credentials and Razorpay Test Key ID:
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_RAZORPAY_KEY_ID=rzp_test_YourKeyId
```

### Step 3: Run Development Server
```bash
npm run dev
```

The application will start at `http://localhost:5173`.

### Step 4: Validate Production Build
To ensure all TypeScript types and assets bundle cleanly:
```bash
npm run build
```

The production output will be generated inside the `dist/` directory.
