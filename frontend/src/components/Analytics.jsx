import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, BarChart3, PieChart as PieIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#ff512f', '#f09819', '#dd2476', '#8b5cf6', '#10b981', '#6366f1'];

export default function Analytics({ token, setAuth }) {
  const navigate = useNavigate();
  const [orderVolume, setOrderVolume] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [routingStats, setRoutingStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }

    const fetchAnalytics = async () => {
      try {
        const [volRes, stockRes, statsRes] = await Promise.all([
          fetch('/api/v1/analytics/order-volume', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/analytics/stock-levels', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/analytics/routing-stats', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (volRes.status === 401) { setAuth(null); return; }

        setOrderVolume(await volRes.json());
        setStockLevels(await stockRes.json());
        setRoutingStats(await statsRes.json());
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token, navigate, setAuth]);

  const pieData = [
    { name: 'Routed Full', value: routingStats.routedFull || 0 },
    { name: 'Routed Partial', value: routingStats.routedPartial || 0 },
    { name: 'Created', value: routingStats.created || 0 },
    { name: 'Shipped', value: routingStats.shipped || 0 },
    { name: 'Cancelled', value: routingStats.cancelled || 0 }
  ].filter(d => d.value > 0);

  if (loading) return <div style={{ padding: '40px', fontSize: '24px', fontWeight: 'bold' }}>Loading Analytics...</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '40px', background: 'var(--bg-color)' }}>
      
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/dashboard')} className="bento-btn-secondary" style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '32px', letterSpacing: '-0.02em' }}>Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Real-time KPI Dashboard</p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Order Volume Line Chart */}
        <div className="bento-box" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="var(--neon-orange)" /> Order Volume (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={orderVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#ff512f" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Routing Success Donut */}
        <div className="bento-box" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieIcon size={20} color="var(--hot-pink)" /> Routing Success Rate
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '28px', fontWeight: 800 }}>
            {routingStats.total || 0} <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Orders</span>
          </div>
        </div>

        {/* Stock Levels Bar Chart */}
        <div className="bento-box" style={{ padding: '32px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--neon-orange)" /> Stock Levels by Warehouse × Product
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={stockLevels} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey={d => `${d.warehouse} - ${d.product}`} tick={{ fontSize: 11 }} width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="available" name="Available" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="reserved" name="Reserved" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
