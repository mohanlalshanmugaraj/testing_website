import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, Clock, ArrowRight, AlertCircle, ShoppingBag, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Order } from '../../types/database.types';

export const MyOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      // 1. Check guest order IDs saved in localStorage
      let guestOrderIds: string[] = [];
      try {
        guestOrderIds = JSON.parse(localStorage.getItem('aura_guest_orders') || '[]');
      } catch (e) {
        guestOrderIds = [];
      }

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name_snapshot,
            quantity,
            unit_price,
            subtotal,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (user) {
        if (guestOrderIds.length > 0) {
          query = query.or(`user_id.eq.${user.id},id.in.(${guestOrderIds.join(',')})`);
        } else {
          query = query.eq('user_id', user.id);
        }
      } else if (guestOrderIds.length > 0) {
        query = query.in('id', guestOrderIds);
      } else {
        // No orders yet for this guest
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setErrorMsg(err.message || 'Failed to retrieve order records.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      // Look up order by exact ID or partial ID prefix
      const cleanId = lookupId.trim();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name_snapshot,
            quantity,
            unit_price,
            subtotal,
            created_at
          )
        `)
        .ilike('id', `${cleanId}%`)
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorMsg(`No order found matching "${cleanId}". Please check the ID and try again.`);
      } else {
        setOrders(data);
      }
    } catch (err: any) {
      setErrorMsg('Lookup error: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            Paid
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            Payment Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {status}
          </span>
        );
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Delivered
          </span>
        );
      case 'Shipped':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Shipped
          </span>
        );
      case 'Processing':
      case 'Confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {status}
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display">Track Customer Orders</h1>
          <p className="text-xs text-slate-500 mt-1">Review orders placed as guest or track by Order ID</p>
        </div>
        <Link
          to="/customer"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Lookup Bar */}
      <form onSubmit={handleLookup} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-8 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Order ID (e.g. 7c9e6679...)"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSearching ? 'Searching...' : 'Find Order'}
        </button>
      </form>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 mb-6 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {loading ? (
        <div className="py-20">
          <LoadingSpinner size="lg" text="Fetching orders..." />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 font-display">No Orders Found</h3>
          <p className="text-sm text-slate-500">
            You haven't placed any test orders yet, or no orders match your search.
          </p>
          <Link
            to="/customer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-slate-400 block font-medium">Order ID</span>
                      <span className="font-mono font-bold text-slate-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Payment</span>
                      {getPaymentStatusBadge(order.payment_status)}
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Fulfillment</span>
                      {getOrderStatusBadge(order.order_status)}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-6 divide-y divide-slate-100">
                  {order.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {item.product_name_snapshot}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          Qty: {item.quantity} &times; ₹{Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        ₹{Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer details */}
                <div className="bg-slate-50/40 px-6 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-500">
                    {order.razorpay_payment_id ? (
                      <span>
                        Razorpay Payment ID: <code className="text-indigo-600 font-mono">{order.razorpay_payment_id}</code>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="w-3.5 h-3.5" /> Awaiting payment completion
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 mr-2">Total Amount:</span>
                    <span className="font-extrabold text-base text-slate-900 font-display">
                      ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
