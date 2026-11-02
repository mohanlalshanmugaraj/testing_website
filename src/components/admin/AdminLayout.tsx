import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Product Catalog', path: '/admin/products', icon: Shirt },
    { name: 'Customer Orders', path: '/admin/orders', icon: ShoppingBag },
  ];

  const handleAdminLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display font-bold text-base text-white leading-tight">Admin Console</h1>
                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Control Hub</p>
              </div>
            </Link>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User info, logout & exit to customer storefront */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-xl text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-white truncate text-[11px]">{profile?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Admin Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            to="/customer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Open Customer Store (/customer)</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
