import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Train, Ship, Plane, LogOut, ArrowLeft, Search, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', path: '/dashboard' },
  { label: 'Shipments', path: '/station' },
  { label: 'Orders', path: '/analytics' },
  { label: 'Inventory', path: '/developer' },
  { label: 'Suppliers', path: '/track' },
];

const TRANSPORT_MODES = [
  { id: 'truck', icon: Truck, label: 'Road' },
  { id: 'train', icon: Train, label: 'Rail' },
  { id: 'ship', icon: Ship, label: 'Sea' },
  { id: 'plane', icon: Plane, label: 'Air' },
];

export default function AppLayout({ children, setAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [transport, setTransport] = useState('train');

  const handleLogout = () => {
    if (setAuth) setAuth(null);
    localStorage.removeItem('stride_token');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5">

        {/* Left: Logo + Greeting */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-[#D22B2B] flex items-center justify-center shadow-md shadow-red-400/20 group-hover:scale-105 transition-transform shrink-0">
            <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
              <path d="M14 3L4 9v10l10 6 10-6V9L14 3z" stroke="white" strokeWidth="2.5" fill="white" fillOpacity=".15"/>
              <path d="M14 25V14M24 9l-10 5L4 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight tracking-tight">Hi, Taufiq!</h1>
            <p className="text-xs text-gray-500 font-medium">Optimize your shipments in real time</p>
          </div>
        </Link>

        {/* Center: Navigation pills */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-gray-200/70">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
                isActive(item.path)
                  ? 'bg-[#D22B2B] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: Utility icons + avatar */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/track')} className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
            <Search size={15}/>
          </button>
          <button onClick={() => navigate('/station')} className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
            <LayoutGrid size={15}/>
          </button>
          <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#D22B2B] hover:bg-red-50 transition-colors shadow-sm cursor-pointer">
            <LogOut size={15}/>
          </button>
          <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold ml-0.5">TA</div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 flex px-6 pb-8 gap-4">

        {/* Left: Transport dock */}
        <aside className="hidden lg:flex flex-col items-center gap-2 pt-1 shrink-0">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 shadow-sm cursor-pointer mb-1">
            <ArrowLeft size={17}/>
          </button>
          <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
            {TRANSPORT_MODES.map((m) => {
              const Icon = m.icon;
              const active = transport === m.id;
              return (
                <button key={m.id} onClick={() => setTransport(m.id)} title={m.label}
                  className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer',
                    active ? 'bg-[#D22B2B] text-white shadow-md shadow-red-400/20' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  )}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 2}/>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <motion.div key={location.pathname} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25}}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
