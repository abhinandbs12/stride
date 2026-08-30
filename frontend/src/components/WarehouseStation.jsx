import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, CheckCircle2, Truck, AlertTriangle, RefreshCw, FileText, ChevronRight, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from './AppLayout';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  CREATED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PARTIALLY_ALLOCATED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ALLOCATED: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  PICKED: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  SHIPPED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function WarehouseStation({ token, setAuth }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [ordRes, whRes, prRes] = await Promise.all([
        fetch('/api/v1/orders?size=100&sort=createdAt,desc', { headers }),
        fetch('/api/v1/warehouses', { headers }),
        fetch('/api/v1/products', { headers }),
      ]);
      if (!ordRes.ok) { setAuth(null); navigate('/login'); return; }
      const ord = await ordRes.json();
      const wh = await whRes.json();
      const pr = await prRes.json();
      setOrders(ord.content || ord || []);
      setWarehouses(wh.content || wh || []);
      setProducts(pr.content || pr || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [token]);

  const whMap = Object.fromEntries(warehouses.map(w => [w.id, w.name]));
  const prMap = Object.fromEntries(products.map(p => [p.id, p]));

  const handleAction = async (orderId, allocId, action) => {
    const key = `${allocId}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/allocations/${allocId}/${action}`, {
        method: 'POST', headers,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.message || 'Action failed'); }
      await fetchData();
    } catch (e) { alert(e.message); }
    setActionLoading(prev => ({ ...prev, [key]: false }));
  };

  const filteredOrders = orders.filter(o => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.id.toLowerCase().includes(q) || o.status.toLowerCase().includes(q);
    }
    return true;
  });

  const statusCounts = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  return (
    <AppLayout token={token} setAuth={setAuth}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Fulfillment Station</h2>
          <p className="text-xs text-gray-500">Pick, pack, and ship orders across all warehouse nodes</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {['ALL', 'CONFIRMED', 'ALLOCATED', 'PICKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-all',
              filter === s ? 'bg-[#D22B2B] text-white border-[#D22B2B]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
            {s === 'ALL' ? `All (${orders.length})` : `${s} (${statusCounts[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID or status..."
          className="w-full sm:w-80 h-9 pl-10 pr-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/15 focus:border-[#D22B2B]"/>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filteredOrders.length === 0 && (
          <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center text-sm text-gray-500">
            No orders found. Place an order from the Dashboard.
          </div>
        )}

        {filteredOrders.map(order => {
          const sc = STATUS_COLORS[order.status] || STATUS_COLORS.CREATED;
          return (
            <motion.div key={order.id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
              className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">

              {/* Order header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', sc.bg)}>
                    <Package size={15} className={sc.text}/>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 font-mono">#{order.id.substring(0, 8)}</div>
                    <div className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', sc.bg, sc.text)}>
                  {order.status}
                </span>
              </div>

              {/* Allocations */}
              {order.lines?.map(line => (
                <div key={line.id} className="ml-10 mb-2">
                  <div className="text-[11px] text-gray-600 mb-1.5">
                    <span className="font-semibold text-gray-800">{prMap[line.productId]?.sku || 'SKU'}</span>
                    {' — '}{prMap[line.productId]?.name || 'Product'} × {line.quantityRequested}
                  </div>

                  {line.allocations?.map(alloc => (
                    <div key={alloc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 mb-1.5">
                      <div className="text-[10px] text-gray-600">
                        <span className="font-semibold text-gray-800">{whMap[alloc.warehouseId] || 'Warehouse'}</span>
                        {' · '}{alloc.quantityAllocated} units · <span className="font-mono">{alloc.status}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {alloc.status === 'ALLOCATED' && (
                          <Button size="sm" variant="outline" onClick={() => handleAction(order.id, alloc.id, 'pick')}
                            disabled={actionLoading[`${alloc.id}-pick`]}>
                            <CheckCircle2 size={12}/> {actionLoading[`${alloc.id}-pick`] ? 'Picking...' : 'Pick'}
                          </Button>
                        )}
                        {alloc.status === 'PICKED' && (
                          <Button size="sm" variant="primary" onClick={() => handleAction(order.id, alloc.id, 'ship')}
                            disabled={actionLoading[`${alloc.id}-ship`]}>
                            <Truck size={12}/> {actionLoading[`${alloc.id}-ship`] ? 'Shipping...' : 'Ship'}
                          </Button>
                        )}
                        {(alloc.status === 'PICKED' || alloc.status === 'SHIPPED') && (
                          <a href={`/api/v1/orders/${order.id}/allocations/${alloc.id}/label`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                            <FileText size={11}/> Label
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          );
        })}
      </div>
    </AppLayout>
  );
}
