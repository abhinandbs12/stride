import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, Leaf, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from './AppLayout';

const COLORS = ['#D22B2B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function Analytics({ token, setAuth }) {
  const navigate = useNavigate();
  const [orderVolume, setOrderVolume] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [routingStats, setRoutingStats] = useState({});
  const [esg, setEsg] = useState({});
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    try {
      const [ov, sl, rs, es] = await Promise.all([
        fetch('/api/v1/analytics/order-volume', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/v1/analytics/stock-levels', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/v1/analytics/routing-stats', { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        fetch('/api/v1/analytics/esg-sustainability', { headers }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      ]);
      setOrderVolume(Array.isArray(ov) ? ov : []);
      setStockLevels(Array.isArray(sl) ? sl : []);
      setRoutingStats(rs || {});
      setEsg(es || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAll();
  }, [token]);

  const statCards = [
    { label: 'Total Orders', value: routingStats.totalOrders || '—', icon: Package, color: '#D22B2B' },
    { label: 'Avg Fill Rate', value: routingStats.averageFillRate ? `${routingStats.averageFillRate.toFixed(1)}%` : '—', icon: TrendingUp, color: '#3B82F6' },
    { label: 'Multi-Node Splits', value: routingStats.multiWarehouseSplits ?? '—', icon: AlertTriangle, color: '#F59E0B' },
    { label: 'Carbon (kg CO₂)', value: esg.totalCarbonKg ? esg.totalCarbonKg.toFixed(1) : '—', icon: Leaf, color: '#10B981' },
  ];

  return (
    <AppLayout token={token} setAuth={setAuth}>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Analytics & ESG</h2>
          <p className="text-xs text-gray-500">Routing intelligence, stock health, and sustainability metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: s.color + '15'}}>
                  <Icon size={15} style={{color: s.color}}/>
                </div>
                <span className="text-[11px] font-semibold text-gray-500">{s.label}</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Order Volume */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Order Volume Trend</h3>
          <div className="h-56">
            {orderVolume.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={orderVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="date" tick={{fontSize:10}} stroke="#9CA3AF"/>
                  <YAxis tick={{fontSize:10}} stroke="#9CA3AF"/>
                  <Tooltip contentStyle={{borderRadius:12,border:'1px solid #E5E7EB',fontSize:11}}/>
                  <Bar dataKey="count" fill="#D22B2B" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No data available — place some orders first</div>
            )}
          </div>
        </div>

        {/* Stock Levels */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Stock Levels by Warehouse</h3>
          <div className="h-56">
            {stockLevels.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={stockLevels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis type="number" tick={{fontSize:10}} stroke="#9CA3AF"/>
                  <YAxis dataKey="warehouse" type="category" tick={{fontSize:10}} stroke="#9CA3AF" width={120}/>
                  <Tooltip contentStyle={{borderRadius:12,border:'1px solid #E5E7EB',fontSize:11}}/>
                  <Bar dataKey="available" fill="#3B82F6" radius={[0,6,6,0]} name="Available"/>
                  <Bar dataKey="reserved" fill="#D22B2B" radius={[0,6,6,0]} name="Reserved"/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No stock data</div>
            )}
          </div>
        </div>
      </div>

      {/* ESG */}
      {Object.keys(esg).length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4">ESG Sustainability Dashboard</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Carbon (kg)', value: esg.totalCarbonKg?.toFixed(1) || '0' },
              { label: 'Avg per Shipment', value: esg.avgCarbonPerShipment?.toFixed(2) || '0' },
              { label: 'Offsets Certified', value: esg.offsetsCertified || 0 },
              { label: 'Green Score', value: esg.greenScore ? `${esg.greenScore}%` : '—' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-lg font-extrabold text-emerald-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
