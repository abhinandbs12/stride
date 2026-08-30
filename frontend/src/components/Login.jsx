import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Package, Truck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Login({ setAuth }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@stride.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid credentials');
      }
      const data = await res.json();
      setAuth(data.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[960px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
      >

        {/* Left Panel — Branding */}
        <div className="relative bg-[#D22B2B] p-10 lg:p-14 flex flex-col justify-between text-white overflow-hidden min-h-[400px]">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute top-1/2 right-10 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
                  <path d="M14 3L4 9v10l10 6 10-6V9L14 3z" stroke="white" strokeWidth="2.5" fill="white" fillOpacity=".15"/>
                  <path d="M14 25V14M24 9l-10 5L4 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-2xl font-extrabold tracking-tight">STRIDE</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
              Multi-Node<br/>Intelligent Freight<br/>Routing
            </h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-xs">
              Enterprise supply chain platform with autonomous nearest-warehouse allocation, pessimistic concurrency control, and real-time logistics tracking.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-6 text-white/70 text-xs font-medium mt-8">
            <span className="flex items-center gap-1.5"><Package size={14}/> Multi-Node</span>
            <span className="flex items-center gap-1.5"><Truck size={14}/> Real-Time</span>
            <span className="flex items-center gap-1.5"><BarChart3 size={14}/> Analytics</span>
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <div className="p-10 lg:p-14 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h3>
            <p className="text-sm text-gray-500">Sign in to your logistics command center</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stride.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/20 focus:border-[#D22B2B] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/20 focus:border-[#D22B2B] transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">{error}</div>
            )}

            <Button variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight size={16}/>}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-8">
            Default credentials: admin@stride.com / password123
          </p>
        </div>
      </motion.div>
    </div>
  );
}
