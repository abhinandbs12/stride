import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, BarChart3, PieChart as PieIcon, Leaf, ShieldCheck, 
  Sparkles, RefreshCw, ArrowUpRight 
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import AppLayout from './AppLayout';

const PIE_COLORS = ['#10B981', '#F59E0B', '#38BDF8', '#6366F1', '#F43F5E'];

export default function Analytics({ token, setAuth }) {
  const navigate = useNavigate();
  const [orderVolume, setOrderVolume] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [routingStats, setRoutingStats] = useState({});
  const [esgData, setEsgData] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const [volRes, stockRes, statsRes, esgRes] = await Promise.all([
        fetch('/api/v1/analytics/order-volume', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/analytics/stock-levels', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/analytics/routing-stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/analytics/esg-sustainability', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (volRes.status === 401) { setAuth(null); return; }

      setOrderVolume(await volRes.json());
      setStockLevels(await stockRes.json());
      setRoutingStats(await statsRes.json());
      setEsgData(await esgRes.json());
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAnalytics();
  }, [token, navigate, setAuth]);

  const pieData = [
    { name: 'Allocated', value: routingStats.routedFull || 0 },
    { name: 'Partial', value: routingStats.routedPartial || 0 },
    { name: 'Created', value: routingStats.created || 0 },
    { name: 'Shipped', value: routingStats.shipped || 0 },
    { name: 'Cancelled', value: routingStats.cancelled || 0 }
  ].filter(d => d.value > 0);

  const esgComparison = [
    { name: 'Single-Hub Baseline', carbon: esgData.baselineCarbonKg || 0, fill: '#F43F5E' },
    { name: 'STRIDE Eco-Optimized', carbon: esgData.totalCarbonKg || 0, fill: '#10B981' }
  ];

  return (
    <AppLayout token={token} setAuth={setAuth}>
      
      {/* Top Header */}
      <div className="app-header">
        <div>
          <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>Analytics & ESG Intelligence</h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Real-time fulfillment metrics & Scope-3 emissions accounting</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="status-badge badge-green">
            <ShieldCheck size={14} /> {esgData.certifiedGreenRating || 'AAA+ Scope-3 Certified'}
          </span>
          <button onClick={fetchAnalytics} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* ESG Sustainability Master Card */}
        <div className="glass-card" style={{ 
          padding: '32px 36px', 
          background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 15px 40px -10px rgba(6, 78, 59, 0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Leaf size={16} /> Scope-3 Carbon Avoidance Metrics
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '6px 0 4px', color: '#F8FAFC' }}>
                {esgData.carbonSavedKg || 0} <span style={{ fontSize: '20px', fontWeight: 600, color: '#34D399' }}>kg CO₂e Avoided</span>
              </h2>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '13px' }}>
                STRIDE nearest-warehouse routing reduced domestic linehaul carbon intensity by <strong style={{ color: '#34D399' }}>{esgData.carbonReductionPct || 0}%</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 22px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>EQUIVALENT TREES</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>🌳 {esgData.treesEquivalent || 0}</div>
                <div style={{ fontSize: '10px', color: '#34D399' }}>Carbon offset/yr</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 22px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>NET CARBON</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>{esgData.totalCarbonKg || 0} <span style={{ fontSize: '13px' }}>kg</span></div>
                <div style={{ fontSize: '10px', color: '#38BDF8' }}>Total emissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts 2x2 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Order Volume (Line Chart) */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#6366F1" /> Order Velocity (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={orderVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#131B30', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px' }} />
                <Line type="monotone" dataKey="orders" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Routing Status Distribution (Donut Chart) */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon size={18} color="#8B5CF6" /> Routing Fulfillment Ratio
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value">
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#131B30', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px' }} />
                <Legend formatter={(val) => <span style={{ color: '#94A3B8', fontSize: '12px' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Carbon Comparison (Bar Chart) */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={18} color="#10B981" /> Carbon Footprint Comparison (kg CO₂e)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={esgComparison} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#131B30', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px' }} />
                <Bar dataKey="carbon" radius={[0, 6, 6, 0]}>
                  {esgComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stock Levels by Node (Bar Chart) */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#38BDF8" /> Inventory Topology Levels
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stockLevels} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis type="category" dataKey={d => `${d.warehouse.split(' ')[0]} - ${d.product}`} tick={{ fill: '#94A3B8', fontSize: 10 }} width={110} />
                <Tooltip contentStyle={{ background: '#131B30', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px' }} />
                <Legend formatter={(val) => <span style={{ color: '#94A3B8', fontSize: '12px' }}>{val}</span>} />
                <Bar dataKey="available" name="Available" fill="#10B981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reserved" name="Reserved" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

      </div>

    </AppLayout>
  );
}
