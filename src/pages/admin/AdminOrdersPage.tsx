import React, { useEffect, useState } from 'react';
import {
  Package,
  Calendar,
  AlertCircle,
  RefreshCw,
  User,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Order, OrderStatus } from '../../types/database.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      // Admin query: Select all orders with customer profile and order_items
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name
          ),
          order_items (
            id,
            product_name_snapshot,
            quantity,
            unit_price,
            subtotal
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching admin orders:', err);
      setErrorMsg(err.message || 'Failed to retrieve customer orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
    } catch (err: any) {
      alert('Failed to update order status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Customer Orders
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor incoming purchases, track Razorpay payment IDs, and advance fulfillment stages
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Orders
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {loading ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200">
          <LoadingSpinner size="lg" text="Retrieving orders database records..." />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">No Orders Found</h3>
          <p className="text-xs text-slate-500">
            Customer checkout orders will appear here once placed via the storefront.
          </p>
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

            const shipping = order.shipping_address as any;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                {/* Order Top Bar */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-slate-400 block font-medium">Order Number</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {order.profiles?.full_name || 'Customer'}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({order.profiles?.email || 'N/A'})
                      </span>
                    </div>
                  </div>

                  {/* Payment Badge & Status Selector */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.payment_status === 'Failed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.payment_status}
                    </span>

                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={order.order_status}
                        disabled={updatingId === order.id}
                        onChange={(e) =>
                          handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                        }
                        className="py-1.5 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none shadow-sm"
                      >
                        {ORDER_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            Status: {status}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Order Items */}
                  <div className="md:col-span-2 divide-y divide-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Line Items
                    </h3>
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{item.product_name_snapshot}</p>
                          <p className="text-slate-400 mt-0.5">
                            Qty: {item.quantity} &times; ₹{Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{Number(item.subtotal).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Shipping & Payment Meta */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        Delivery Address
                      </h4>
                      {shipping ? (
                        <div className="text-slate-600 space-y-0.5 leading-relaxed">
                          <p className="font-semibold text-slate-900">{shipping.fullName}</p>
                          <p>{shipping.addressLine1}</p>
                          {shipping.addressLine2 && <p>{shipping.addressLine2}</p>}
                          <p>
                            {shipping.city}, {shipping.state} - {shipping.postalCode}
                          </p>
                          <p className="text-slate-500 font-mono">Tel: {shipping.phone}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No delivery address recorded.</p>
                      )}
                    </div>

                    <div className="border-t border-slate-200/60 pt-2 space-y-1">
                      <p className="text-slate-500">
                        Razorpay Order: <span className="font-mono text-slate-800">{order.razorpay_order_id || 'N/A'}</span>
                      </p>
                      <p className="text-slate-500">
                        Payment ID: <span className="font-mono text-indigo-600">{order.razorpay_payment_id || 'Pending'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer total */}
                <div className="bg-slate-50/40 px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Charged</span>
                  <span className="font-extrabold text-base text-slate-900 font-display">
                    ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
