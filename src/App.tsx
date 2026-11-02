import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Customer Pages (No login required)
import { HomePage } from './pages/customer/HomePage';
import { ProductDetailPage } from './pages/customer/ProductDetailPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { MyOrdersPage } from './pages/customer/MyOrdersPage';

// Admin Pages (Login only)
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminProductFormPage } from './pages/admin/AdminProductFormPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';

// Customer Layout Shell
const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
};

// Admin Root Redirect Helper
const AdminRootRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/admin/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Root redirects to /customer */}
            <Route path="/" element={<Navigate to="/customer" replace />} />

            {/* ============================================================== */}
            {/* CUSTOMER STOREFRONT (No login required)                         */}
            {/* ============================================================== */}
            <Route
              path="/customer"
              element={
                <CustomerLayout>
                  <HomePage />
                </CustomerLayout>
              }
            />
            <Route
              path="/customer/product/:id"
              element={
                <CustomerLayout>
                  <ProductDetailPage />
                </CustomerLayout>
              }
            />
            <Route
              path="/product/:id"
              element={<Navigate to="/customer" replace />}
            />

            <Route
              path="/customer/cart"
              element={
                <CustomerLayout>
                  <CartPage />
                </CustomerLayout>
              }
            />
            <Route
              path="/cart"
              element={<Navigate to="/customer/cart" replace />}
            />

            <Route
              path="/customer/checkout"
              element={
                <CustomerLayout>
                  <CheckoutPage />
                </CustomerLayout>
              }
            />
            <Route
              path="/checkout"
              element={<Navigate to="/customer/checkout" replace />}
            />

            <Route
              path="/customer/orders"
              element={
                <CustomerLayout>
                  <MyOrdersPage />
                </CustomerLayout>
              }
            />
            <Route
              path="/my-orders"
              element={<Navigate to="/customer/orders" replace />}
            />

            {/* ============================================================== */}
            {/* ADMIN SECTION (Login only)                                     */}
            {/* ============================================================== */}
            {/* /admin redirects to /admin/dashboard or /admin/login */}
            <Route path="/admin" element={<AdminRootRedirect />} />

            {/* Admin Login page */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin Console */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<AdminProductFormPage />} />
              <Route path="products/:id/edit" element={<AdminProductFormPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
            </Route>

            {/* Catch-all fallback -> /customer */}
            <Route path="*" element={<Navigate to="/customer" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
