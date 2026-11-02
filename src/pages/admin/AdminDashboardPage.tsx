import React, { useEffect, useState } from 'react';
import {
  Package,
  Users,
  CreditCard,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface DashboardMetrics {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  totalSuccessfulPayments: number;
  totalRevenue: number;
}

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalSuccessfulPayments: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      // 1. Total products count
      const { count: productCount, error: pErr } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (pErr) throw pErr;

      // 2. Total customers count (role = customer)
      const { count: customerCount, error: cErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');
      if (cErr) throw cErr;

      // 3. Orders stats
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('id, total_amount, payment_status');
      if (oErr) throw oErr;

      const totalOrders = orders?.length || 0;
      const paidOrders = orders?.filter((o) => o.payment_status === 'Paid') || [];
      const totalSuccessfulPayments = paidOrders.length;
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

      setMetrics({
        totalProducts: productCount || 0,
        totalCustomers: customerCount || 0,
        totalOrders,
        totalSuccessfulPayments,
        totalRevenue,
      });
    } catch (err: any) {
      console.error('Error fetching admin metrics:', err);
      setErrorMsg(err.message || 'Failed to retrieve administrative metrics.');
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Revenue',
      value: `₹${metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: 'From verified paid orders',
      icon: IndianRupee,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Successful Payments',
      value: metrics.totalSuccessfulPayments,
      subtitle: `${metrics.totalOrders} total checkout orders`,
      icon: CreditCard,
      color: 'from-indigo-500 to-violet-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Total Products',
      value: metrics.totalProducts,
      subtitle: 'Active & draft inventory',
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Registered Customers',
      value: metrics.totalCustomers,
      subtitle: 'Public signups with customer role',
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time business performance derived directly from PostgreSQL
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {loading ? (
        <div className="py-20">
          <LoadingSpinner size="lg" text="Aggregating metrics from Supabase..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {card.title}
                  </span>
                  <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.textColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                    {card.value}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{card.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Information card on Test Architecture */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900 font-display">
            Infrastructure &amp; Free-Tier Health
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          This sample instance is running in development mode on free-tier services. All metrics reflect live records in your connected Supabase PostgreSQL instance. Razorpay orders are processed in Test Mode with HMAC SHA256 integrity checks.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Supabase Free DB</span>
            <span className="text-slate-500">500 MB quota &bull; Row Level Security on all tables</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Storage Bucket</span>
            <span className="text-slate-500">product-images &bull; 1 GB Free Tier</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-800 block">Razorpay Test Mode</span>
            <span className="text-slate-500">INR currency &bull; Safe simulated transactions</span>
          </div>
        </div>
      </div>
    </div>
  );
};
