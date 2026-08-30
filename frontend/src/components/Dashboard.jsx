import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowUpRight, ArrowRight, Zap, RefreshCw, Package, Train,
  Phone, MessageSquare, ZoomIn, Maximize2, X, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from './AppLayout';
import { cn } from '@/lib/utils';

/* ════════════════════════════════════════════════════════════
   Reusable tiny components
   ════════════════════════════════════════════════════════════ */

function KpiHeader({ title, onNav }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[13px] font-bold text-gray-900">{title}</span>
      <button onClick={onNav} className="text-gray-400 hover:text-gray-800 cursor-pointer"><ArrowUpRight size={16}/></button>
    </div>
  );
}

function DonutRing({ percent, color, label }) {
  const circ = 2 * Math.PI * 18;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="56" height="56" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" fill="none" stroke="#F3F4F6" strokeWidth="5"/>
        <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 24 24)" className="transition-all duration-700"/>
        <text x="24" y="26" textAnchor="middle" className="text-[10px] font-bold fill-gray-900">{percent}%</text>
      </svg>
      <span className="text-[10px] font-semibold mt-1" style={{color}}>{label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Dashboard
   ════════════════════════════════════════════════════════════ */

export default function Dashboard({ token, setAuth }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [routingStats, setRoutingStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeContainer, setActiveContainer] = useState(1);
  const [showConsole, setShowConsole] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(3);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [stressCount, setStressCount] = useState(10);
  const [stressing, setStressing] = useState(false);
  const [stressResult, setStressResult] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    try {
      const [wh, pr, ord, st, rs] = await Promise.all([
        fetch('/api/v1/warehouses', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/v1/products', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/v1/orders?size=50&sort=createdAt,desc', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/v1/stock?size=500', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/v1/analytics/routing-stats', { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      if (!wh) { setAuth(null); navigate('/login'); return; }
      const whList = wh.content || wh || [];
      const prList = pr?.content || pr || [];
      setWarehouses(Array.isArray(whList) ? whList : []);
      setProducts(Array.isArray(prList) ? prList : []);
      if (!selectedProduct && prList.length) setSelectedProduct(prList[0].id);
      setOrders(ord?.content || ord || []);
      setStock(st?.content || st || []);
      setRoutingStats(rs || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAll();
    const iv = setInterval(fetchAll, 6000);
    return () => clearInterval(iv);
  }, [token]);

  /* Derived metrics */
  const totalOrders = orders.length;
  const delivered = orders.filter(o => o.status === 'SHIPPED' || o.status === 'DELIVERED').length;
  const pending = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PARTIALLY_ALLOCATED' || o.status === 'CREATED').length;
  const totalStock = stock.reduce((s, i) => s + (i.availableToPromise || 0), 0);
  const onTime = routingStats.averageFillRate ? `${routingStats.averageFillRate.toFixed(1)}%` : '96.3%';
  const activeWh = warehouses[0];

  /* Dispatch order */
  const handleDispatch = async () => {
    if (!selectedProduct) return;
    setDispatching(true);
    setDispatchResult(null);
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: '8f3b2075-81fa-4f91-9e23-74a6bfb3017a', lines: [{ productId: selectedProduct, quantity: +qty }] }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed'); }
      const data = await res.json();
      setDispatchResult({ ok: true, msg: `Order #${data.id.substring(0,8)} → ${data.status}` });
      fetchAll();
    } catch (e) { setDispatchResult({ ok: false, msg: e.message }); }
    setDispatching(false);
  };

  /* Stress test */
  const handleStress = async () => {
    setStressing(true); setStressResult(null);
    try {
      const pid = selectedProduct || products[0]?.id;
      const res = await fetch(`/api/v1/orders/stress-test?count=${stressCount}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: '8f3b2075-81fa-4f91-9e23-74a6bfb3017a', lines: [{ productId: pid, quantity: 1 }] }),
      });
      if (!res.ok) throw new Error('Stress test failed');
      const data = await res.json();
      setStressResult(data);
      fetchAll();
    } catch (e) { setStressResult({ error: e.message }); }
    setStressing(false);
  };

  return (
    <AppLayout token={token} setAuth={setAuth}>

      {/* ── Row 1: Hero Scene + Route Map ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">

        {/* Hero: 3D Freight Scene */}
        <div className="lg:col-span-8 relative h-[380px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <img src="/hero_train.jpg" alt="3D Freight Terminal" className="absolute inset-0 w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-white/25 via-transparent to-black/5"/>

          {/* Officer card */}
          <div className="absolute top-4 left-4 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur shadow-lg border border-white/80 z-10">
            <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-700">JA</div>
            <div>
              <div className="text-[11px] font-bold text-gray-900">Jonathan Adams</div>
              <div className="text-[10px] text-gray-500 font-mono">779020018</div>
            </div>
            <button onClick={() => alert('Connecting to dispatch officer...')} className="ml-2 flex items-center gap-1 px-3 py-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold hover:bg-gray-800 cursor-pointer">
              <Phone size={10}/> Call Officer
            </button>
            <button className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#D22B2B] cursor-pointer">
              <MessageSquare size={11}/>
            </button>
          </div>

          {/* Units breakdown */}
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.2,duration:0.4}}
            className="absolute top-1/2 -translate-y-1/2 right-5 z-10 w-[200px] p-4 rounded-2xl bg-white/95 backdrop-blur shadow-xl border border-white/80">
            <div className="text-[11px] font-bold text-gray-900 mb-2">Units Load Breakdown</div>
            <div className="space-y-1.5 text-[11px] text-gray-600 font-medium">
              <div className="flex items-center gap-2"><span className="w-2 h-1.5 rounded-full bg-blue-500"/><span>Loose Cargo</span><span className="ml-auto font-bold text-gray-900 font-mono">67</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-1.5 rounded-full bg-[#D22B2B]"/><span>Palletized</span><span className="ml-auto font-bold text-gray-900 font-mono">84</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-1.5 rounded-full bg-gray-400"/><span>Liquid</span><span className="ml-auto font-bold text-gray-900 font-mono">39</span></div>
            </div>
            <div className="flex justify-center pt-3 mt-2 border-t border-gray-100">
              <div className="relative w-12 h-12">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="3.5"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="3.5" strokeDasharray="35 100"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#D22B2B" strokeWidth="3.5" strokeDasharray="44 100" strokeDashoffset="-35"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#9CA3AF" strokeWidth="3.5" strokeDasharray="21 100" strokeDashoffset="-79"/>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-900">190</span>
              </div>
            </div>
          </motion.div>

          {/* Container tabs */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
            {[
              { n: 1, img: '/red_container.jpg', code: 'T8210', sub: 'Active Bay', color: '#D22B2B' },
              { n: 2, img: '/white_container.jpg', code: 'T8211', sub: 'Bay 02', color: '#9CA3AF' },
            ].map((c) => (
              <button key={c.n} onClick={() => setActiveContainer(c.n)}
                className={cn('flex items-center gap-2 p-1.5 rounded-xl bg-white/95 backdrop-blur border shadow-lg cursor-pointer transition-all',
                  activeContainer === c.n ? 'border-[#D22B2B] ring-2 ring-red-400/20 scale-105' : 'border-white/80 hover:bg-white')}>
                <span className="text-lg font-extrabold px-0.5" style={{color: c.color}}>{c.n}</span>
                <img src={c.img} alt={c.code} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100"/>
                <div className="text-left pr-1">
                  <div className="text-[9px] font-mono font-bold text-gray-900">{c.code}</div>
                  <div className="text-[8px] font-semibold" style={{color: c.color}}>{c.sub}</div>
                </div>
              </button>
            ))}
            <button onClick={() => alert('Add container bay...')} className="w-9 h-9 rounded-xl bg-white/95 backdrop-blur border border-white/80 shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer">
              <ArrowRight size={15}/>
            </button>
          </div>
        </div>

        {/* ROUTE-14D Map */}
        <div className="lg:col-span-4 h-[380px] rounded-2xl bg-gray-900 text-white p-5 shadow-lg flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D22B2B] animate-pulse"/>
              <span className="text-[11px] font-mono font-bold tracking-wider">ROUTE-14D</span>
            </div>
            <div className="flex gap-1">
              <button className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"><ZoomIn size={11}/></button>
              <button onClick={() => navigate('/station')} className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"><Maximize2 size={11}/></button>
            </div>
          </div>

          {/* Map */}
          <div className="h-28 rounded-xl overflow-hidden border border-gray-800 mb-2 relative">
            <MapContainer center={[activeWh?.latitude || 41.8781, activeWh?.longitude || -87.6298]} zoom={4}
              style={{width:'100%',height:'100%',background:'#111827'}} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
              {warehouses.map(w => (
                <CircleMarker key={w.id} center={[w.latitude, w.longitude]} radius={6}
                  pathOptions={{color:'#D22B2B',fillColor:'#D22B2B',fillOpacity:0.9,weight:2}}>
                  <Popup><span className="text-xs font-bold">{w.name}</span></Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="text-[9px] text-gray-500 font-mono mb-3">
            Lat: {(activeWh?.latitude || 41.8781).toFixed(4)}, Long: {(activeWh?.longitude || -87.6298).toFixed(4)}
          </div>

          {/* Timeline */}
          <div className="flex-1 flex flex-col justify-end space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-600"/><div><div className="font-semibold text-gray-300">Birmingham Depot</div><div className="text-[9px] text-gray-500 font-mono">10:12 PM</div></div></div>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">Delivered</span>
            </div>
            <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-gray-800/80 border border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#D22B2B] flex items-center justify-center text-white"><Train size={11}/></div>
                <div><div className="font-bold text-white">ST-288310</div><div className="text-[9px] text-gray-400 font-mono">London Hub · 12:41 AM</div></div>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse"/>Arriving
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-600"/><span className="font-semibold text-gray-400">ST-472891</span></div>
              <span className="text-[9px] font-mono text-gray-500">ETA: 12 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Console Toggle ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <Button variant={showConsole ? 'danger' : 'primary'} size="sm" onClick={() => setShowConsole(!showConsole)}>
          <Zap size={13}/>
          {showConsole ? 'Close Console' : 'Open Multi-Node Routing Console'}
        </Button>
        <div className="flex items-center gap-3">
          {activeWh && <span className="text-xs text-gray-500 hidden sm:inline">Active: <span className="font-semibold text-gray-800">{activeWh.name}</span></span>}
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
            Sync
          </Button>
        </div>
      </div>

      {/* ── Routing Console ─────────────────────────────── */}
      <AnimatePresence>
        {showConsole && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="mb-5">
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Multi-Node Fulfillment Dispatcher</h3>
                  <p className="text-xs text-gray-500">Nearest-warehouse stock reservation with pessimistic locking</p>
                </div>
                <button onClick={() => setShowConsole(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X size={16}/></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Order form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Product</label>
                    <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/20 focus:border-[#D22B2B] cursor-pointer">
                      {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Qty</label>
                      <input type="number" min="1" max="500" value={qty} onChange={e => setQty(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono font-bold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/20 focus:border-[#D22B2B]"/>
                    </div>
                    <div className="flex-1 flex items-end">
                      <Button onClick={handleDispatch} disabled={dispatching || !selectedProduct} className="w-full">
                        {dispatching ? 'Routing...' : 'Dispatch Order'}
                      </Button>
                    </div>
                  </div>
                  {dispatchResult && (
                    <div className={cn('p-3 rounded-xl text-xs font-semibold border', dispatchResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700')}>
                      {dispatchResult.msg}
                    </div>
                  )}
                </div>

                {/* Stress test */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">Concurrency Stress Test</div>
                  <p className="text-[10px] text-gray-500 mb-3">Fires simultaneous requests to test pessimistic locks</p>
                  <div className="flex gap-1.5 mb-3">
                    {[10, 25, 50].map(n => (
                      <button key={n} onClick={() => setStressCount(n)}
                        className={cn('flex-1 h-8 rounded-lg text-xs font-bold border cursor-pointer transition-all',
                          stressCount === n ? 'bg-[#D22B2B] text-white border-[#D22B2B]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100')}>
                        {n}x
                      </button>
                    ))}
                  </div>
                  <Button variant="dark" size="sm" onClick={handleStress} disabled={stressing} className="w-full">
                    {stressing ? 'Firing...' : `Run ${stressCount}x Stress Test`}
                  </Button>
                  {stressResult && !stressResult.error && (
                    <div className="mt-2 p-2 rounded-lg bg-white border border-gray-200 text-[11px] font-mono">
                      <span className="text-emerald-600 font-bold">✓ {stressResult.successfulAllocations || 0} OK</span>
                      {' · '}
                      <span className="text-red-600 font-bold">🛡 {stressResult.concurrencyErrorsPrevented || 0} Race Blocked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Row 2: 4 KPI Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Card 1: Package Delivered */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between min-h-[210px]">
          <div>
            <KpiHeader title="Package Delivered" onNav={() => navigate('/station')}/>
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">{delivered || 812}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Shipment Completed</div>
          </div>
          <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-900 mb-1">Failed Deliveries</div>
              <button onClick={() => navigate('/station')} className="px-3 py-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold hover:bg-gray-800 cursor-pointer">Review</button>
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold text-gray-900 font-mono">{pending || 36}</div>
              <div className="text-[9px] text-gray-400">Requires Action</div>
            </div>
          </div>
        </div>

        {/* Card 2: Shipment Status */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between min-h-[210px]">
          <KpiHeader title="Shipment Status" onNav={() => navigate('/analytics')}/>
          <div className="flex items-center justify-around my-2">
            <DonutRing percent={20} color="#D22B2B" label="Critical"/>
            <DonutRing percent={32} color="#9CA3AF" label="Warning"/>
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">48%</span>
              <span className="text-[11px] font-bold text-gray-900">Good Status</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">On Track</span>
          </div>
        </div>

        {/* Card 3: Package Flow */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between min-h-[210px]">
          <div>
            <KpiHeader title="Package Flow" onNav={() => navigate('/analytics')}/>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">+112</div>
            <div className="text-[11px] text-gray-500">Processed Units</div>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-semibold text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"/>Inbound</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D22B2B]"/>Outbound</span>
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100 relative h-14">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M0,30 Q25,10 50,18 T100,5" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
              <path d="M0,35 Q25,22 50,28 T100,12" fill="none" stroke="#D22B2B" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div className="absolute top-0 right-2 px-2 py-1 rounded-lg bg-gray-900 text-white text-[8px] font-mono shadow-lg">
              <div className="text-emerald-400 font-bold">+12%</div>
              <div>In: 32 · Out: 21</div>
            </div>
          </div>
        </div>

        {/* Card 4: Shipping Performance */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between min-h-[210px]">
          <KpiHeader title="Shipping Performance" onNav={() => navigate('/analytics')}/>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-xl font-extrabold text-gray-900">{totalOrders > 0 ? totalOrders.toLocaleString() : '1,284'}</div>
              <div className="text-[9px] text-gray-400">Total Shipments</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-gray-900">{onTime}</div>
              <div className="text-[9px] text-gray-400">On-Time Rate</div>
            </div>
          </div>
          <button className="w-full py-1.5 rounded-full bg-gray-900 text-white text-[10px] font-semibold hover:bg-gray-800 mb-2 cursor-pointer">Generate Report</button>
          <div className="pt-2 border-t border-gray-100 flex items-end justify-between gap-0.5 text-[9px] font-semibold text-gray-400 text-center">
            {['Mon','Tue','Wed','Thu'].map((d, i) => (
              <div key={d}><div className={cn('w-4 rounded bg-gray-100 mb-1')} style={{height: [20,28,36,24][i]}}/><span>{d}</span></div>
            ))}
            <div className="relative">
              <div className="px-2 py-0.5 rounded-lg bg-[#D22B2B] text-white font-mono font-bold text-[9px] shadow mb-1">
                378
                <div className="text-[7px] font-normal text-red-200">Shipments</div>
              </div>
              <span className="text-[#D22B2B] font-bold">● Fri</span>
            </div>
          </div>
        </div>
      </div>

    </AppLayout>
  );
}
