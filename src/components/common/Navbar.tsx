import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Menu,
  X,
  Shield,
  Package,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, isConfigured } = useAuth();
  const { totalItems } = useCart();

  return (
    <>
      {!isConfigured && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            Database not connected. Please configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>.
          </span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo -> /customer */}
            <Link to="/customer" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Aura<span className="text-indigo-600">Attire</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1">
                  Customer Storefront
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/customer"
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                Collection
              </Link>
              <Link
                to="/customer/orders"
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <Package className="w-4 h-4 text-slate-400" />
                Track Orders
              </Link>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Cart button */}
              <Link
                to="/customer/cart"
                className="relative p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 text-white rounded-full text-[11px] font-bold flex items-center justify-center shadow-sm animate-pulse">
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* Admin Portal access button (No customer login needed) */}
              <div className="hidden sm:flex items-center pl-3 border-l border-slate-200">
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/admin/login'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 transition-all"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAdmin ? 'Admin Dashboard' : 'Admin Login'}</span>
                </Link>
              </div>

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
            <Link
              to="/customer"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-slate-50"
            >
              Collection
            </Link>
            <Link
              to="/customer/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-slate-50"
            >
              Track Orders
            </Link>
            <Link
              to="/customer/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cart ({totalItems})
            </Link>
            <div className="pt-3 border-t border-slate-100">
              <Link
                to={isAdmin ? '/admin/dashboard' : '/admin/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'Admin Dashboard' : 'Admin Login'}</span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
