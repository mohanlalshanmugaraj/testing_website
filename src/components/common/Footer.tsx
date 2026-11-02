import React from 'react';
import { Sparkles, ShieldCheck, CreditCard, RefreshCw } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                Aura<span className="text-indigo-400">Attire</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              Full-Stack Clothing E-Commerce sample application built for infrastructure, deployment, and Razorpay test mode verification.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Razorpay Test Mode Enabled &bull; No Real Money Charged</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>React 19 &bull; Vite &bull; Tailwind CSS</li>
              <li>Supabase Auth &bull; Postgres &bull; Storage</li>
              <li>Supabase Edge Functions (Deno)</li>
              <li>Cloudflare Pages Static Hosting</li>
            </ul>
          </div>

          {/* Badges */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">
              Test Security
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Row Level Security (RLS)
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                HMAC SHA256 Signature Verification
              </li>
              <li className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                Server-side Stock &amp; Price Guard
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Aura Attire Test Lab. Strictly for development and testing.</p>
          <p className="font-mono text-[11px]">Free Tier Testing: Supabase + Cloudflare Pages + Razorpay Test</p>
        </div>
      </div>
    </footer>
  );
};
