import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const CartPage: React.FC = () => {
  const { items, updateQuantity, removeFromCart, subtotal, totalAmount } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 font-display">Your Cart is Empty</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          Looks like you haven't added any clothing pieces to your cart yet. Explore our latest arrivals.
        </p>
        <div className="pt-2">
          <Link
            to="/customer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Explore Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-1">Review your apparel items before checkout</p>
        </div>
        <Link
          to="/customer"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const primaryImg =
              item.product.product_images && item.product.product_images.length > 0
                ? item.product.product_images[0].image_url
                : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=300&q=80';

            const itemSubtotal = Number(item.product.price) * item.quantity;
            const isAtMaxStock = item.quantity >= item.product.stock_quantity;

            return (
              <div
                key={item.product.id}
                className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="w-full sm:w-24 h-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  <img
                    src={primaryImg}
                    alt={item.product.name}
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.product.category}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1 line-clamp-1">
                          {item.product.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      ₹{Number(item.product.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })} each
                    </p>
                  </div>

                  {/* Quantity & Item Subtotal */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold font-mono text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={isAtMaxStock}
                        className="p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 font-display">
                        ₹{itemSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm sticky top-24 space-y-5">
            <h2 className="text-lg font-bold text-slate-900 font-display">Order Summary</h2>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Shipping</span>
                <span>FREE (Test Mode)</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes &amp; Duties</span>
                <span className="text-slate-400">Included</span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline text-base font-extrabold text-slate-900 font-display">
                <span>Total Amount</span>
                <span className="text-xl text-indigo-600 font-display">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/customer/checkout')}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Test Mode Simulation</span>
              </div>
              <p>Prices and stock availability will be re-verified against PostgreSQL before payment order generation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
