import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase is not configured yet. Please check .env settings.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please enter both administrative email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Sign in with Supabase Auth
      const { error } = await login(email.trim(), password);
      if (error) {
        throw error;
      }

      // 2. Verify admin role on profiles table directly
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication session failed.');
      }

      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profError || !profile || profile.role !== 'admin') {
        // Sign out if not an admin
        await supabase.auth.signOut();
        throw new Error('Access Denied: This account does not possess administrator privileges.');
      }

      // 3. Admin verified, navigate to dashboard
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Admin login error:', err);
      setErrorMsg(err.message || 'Failed to authenticate administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
            Admin Console
          </h1>
          <p className="text-xs text-slate-400">
            Secure administrative authentication for catalog and order management
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-rose-950/50 border border-rose-800 p-4 flex items-start gap-3 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aura.test"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/80 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/80 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            id="admin-login-button"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" text="Verifying Admin Access..." />
            ) : (
              'Sign In to Admin Dashboard'
            )}
          </button>
        </form>

        <div className="border-t border-slate-700/60 pt-4 text-center">
          <Link
            to="/customer"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-400 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
