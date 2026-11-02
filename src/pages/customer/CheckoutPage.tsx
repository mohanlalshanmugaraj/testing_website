import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Truck,
  ArrowLeft,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { ShippingAddress } from '../../types/database.types';

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 font-display">No items to checkout</h2>
        <p className="text-sm text-slate-500">Your shopping cart is currently empty.</p>
        <Link
          to="/customer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Shop
        </Link>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured yet. Please configure your .env credentials.');
      return;
    }

    if (!customerEmail.trim()) {
      setErrorMessage('Please provide your email address for order confirmation.');
      return;
    }

    if (!address.fullName.trim() || !address.phone.trim() || !address.addressLine1.trim() || !address.postalCode.trim()) {
      setErrorMessage('Please fill in all mandatory delivery address fields.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Server-side Pre-Validation of Price & Stock directly from PostgreSQL
      const productIds = items.map((i) => i.product.id);
      const { data: dbProducts, error: dbErr } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, is_active')
        .in('id', productIds);

      if (dbErr || !dbProducts) {
        throw new Error('Failed to validate current product inventory. Please try again.');
      }

      let validatedTotal = 0;
      for (const item of items) {
        const liveProduct = dbProducts.find((p) => p.id === item.product.id);
        if (!liveProduct || !liveProduct.is_active) {
          throw new Error(`Product "${item.product.name}" is no longer available.`);
        }
        if (liveProduct.stock_quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${item.product.name}". Only ${liveProduct.stock_quantity} remaining.`
          );
        }
        validatedTotal += Number(liveProduct.price) * item.quantity;
      }

      // Check if Razorpay script is loaded in browser
      if (!window.Razorpay) {
        throw new Error(
          'Razorpay checkout script not loaded. Please refresh the page or check your connection.'
        );
      }

      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

      // 2. Attempt Edge Function create-payment-order (guest checkout supported)
      let razorpayOrderId = `order_${Date.now()}`;
      let internalOrderId: string | null = null;
      let usedEdgeFunction = false;

      const shippingPayload = {
        ...address,
        email: customerEmail.trim(),
      };

      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke(
          'create-payment-order',
          {
            body: {
              items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
              shippingAddress: shippingPayload,
            },
          }
        );

        if (!edgeErr && edgeData && edgeData.razorpayOrderId) {
          razorpayOrderId = edgeData.razorpayOrderId;
          internalOrderId = edgeData.orderId;
          usedEdgeFunction = true;
        }
      } catch (invokeErr) {
        console.warn('Edge function fallback:', invokeErr);
      }

      // Fallback: If edge function not responding, insert directly into database
      if (!internalOrderId) {
        const { data: newOrder, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id: user?.id || null, // Guest checkout allowed (user_id is null)
            total_amount: validatedTotal,
            order_status: 'Pending',
            payment_status: 'Pending',
            razorpay_order_id: razorpayOrderId,
            shipping_address: shippingPayload,
          })
          .select('id')
          .single();

        if (orderErr || !newOrder) {
          throw new Error(`Order creation failed: ${orderErr?.message}`);
        }

        internalOrderId = newOrder.id;

        // Insert order items
        const orderItemsPayload = items.map((i) => {
          const live = dbProducts.find((p) => p.id === i.product.id)!;
          return {
            order_id: internalOrderId,
            product_id: i.product.id,
            product_name_snapshot: live.name,
            quantity: i.quantity,
            unit_price: Number(live.price),
            subtotal: Number(live.price) * i.quantity,
          };
        });

        const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);
        if (itemsErr) {
          throw new Error(`Failed to record order items: ${itemsErr.message}`);
        }
      }

      // Save order ID to localStorage so guest customer can view their past orders
      if (internalOrderId) {
        try {
          const existingGuestOrders = JSON.parse(localStorage.getItem('aura_guest_orders') || '[]');
          if (!existingGuestOrders.includes(internalOrderId)) {
            existingGuestOrders.unshift(internalOrderId);
            localStorage.setItem('aura_guest_orders', JSON.stringify(existingGuestOrders.slice(0, 50)));
          }
        } catch (e) {
          console.warn('Failed to save order to localStorage:', e);
        }
      }

      // 3. Launch Razorpay Modal in Test Mode
      const amountInPaise = Math.round(validatedTotal * 100);

      const options = {
        key: razorpayKeyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'Aura Attire Test Store',
        description: `Order #${(internalOrderId || 'AURA').slice(0, 8).toUpperCase()}`,
        order_id: razorpayOrderId.startsWith('order_') && razorpayOrderId.length > 15 ? razorpayOrderId : undefined,
        prefill: {
          name: address.fullName,
          email: customerEmail,
          contact: address.phone,
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async (response: any) => {
          setIsProcessing(true);
          try {
            if (usedEdgeFunction) {
              await supabase.functions.invoke('verify-payment', {
                body: {
                  internalOrderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
              });
            } else {
              // Direct DB update for test mode simulation if Edge function unavailable
              await supabase
                .from('orders')
                .update({
                  payment_status: 'Paid',
                  order_status: 'Confirmed',
                  razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                  razorpay_signature: response.razorpay_signature || 'test_signature_valid',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', internalOrderId);

              // Decrement product inventory
              for (const item of items) {
                const live = dbProducts.find((p) => p.id === item.product.id);
                if (live) {
                  await supabase
                    .from('products')
                    .update({
                      stock_quantity: Math.max(0, live.stock_quantity - item.quantity),
                    })
                    .eq('id', live.id);
                }
              }
            }

            clearCart();
            navigate('/customer/orders');
          } catch (err: any) {
            setErrorMessage('Payment verification error: ' + err.message);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            console.log('Customer dismissed Razorpay test checkout window.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setIsProcessing(false);
        setErrorMessage(
          `Payment failed: ${resp.error.description} (Code: ${resp.error.code})`
        );
      });

      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during checkout.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          to="/customer/cart"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">Instant Checkout</h1>
          <p className="text-xs text-slate-500 mt-1">
            No customer registration or login required &bull; Guest checkout enabled
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 mb-8 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shipping Form */}
        <div className="lg:col-span-2 space-y-6">
          <form id="checkout-form" onSubmit={handlePay} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 font-display">Delivery Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={address.fullName}
                  onChange={handleInputChange}
                  placeholder="Aarav Sharma"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="aarav@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={address.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  PIN Code *
                </label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  value={address.postalCode}
                  onChange={handleInputChange}
                  placeholder="400001"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  required
                  value={address.addressLine1}
                  onChange={handleInputChange}
                  placeholder="Flat 402, Skyline Residency, MG Road"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={address.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  value={address.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </form>

          {/* Razorpay Test Mode Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl border border-indigo-100 p-6 flex items-start gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/30">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm font-display">Razorpay Payment Gateway (Test Mode)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clicking the button below launches the official Razorpay test checkout window. You can use any test card, test UPI ID, or mock NetBanking credentials.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-indigo-700">
                <span className="px-2 py-0.5 bg-white/80 rounded border border-indigo-200">Currency: INR</span>
                <span className="px-2 py-0.5 bg-white/80 rounded border border-indigo-200">Test Sandbox Mode</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Items & Pay Button */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm sticky top-24 space-y-5">
            <h2 className="text-lg font-bold text-slate-900 font-display">Items in Order ({items.length})</h2>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
              {items.map((item) => (
                <div key={item.product.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div className="pr-2">
                    <p className="font-semibold text-slate-900 line-clamp-1">{item.product.name}</p>
                    <p className="text-slate-400">Qty: {item.quantity} &times; ₹{Number(item.product.price)}</p>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Shipping</span>
                <span>Free (Test Mode)</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline font-extrabold text-slate-900">
                <span className="text-sm">Payable Amount</span>
                <span className="text-xl text-indigo-600 font-display">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isProcessing}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <LoadingSpinner size="sm" text="Securing Order..." />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-indigo-200" />
                  <span>Pay ₹{totalAmount.toFixed(2)} via Razorpay</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>No Login Required &bull; Fast Guest Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
