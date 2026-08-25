import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, BarChart3, PieChart as PieIcon, Leaf, ShieldCheck, Zap } from 'lucide-react';
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
  const [esgData, setEsgData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }

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
    { name: 'Standard Single-Hub Freight', carbon: esgData.baselineCarbonKg || 0, fill: '#EF4444' },
    { name: 'STRIDE Eco-Optimized', carbon: esgData.totalCarbonKg || 0, fill: '#10B981' }
  ];

  if (loading) return <div style={{ padding: '40px', fontSize: '24px', fontWeight: 'bold' }}>Loading Analytics & ESG Intelligence...</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '40px', background: 'var(--bg-color)' }}>
      
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} className="bento-btn-secondary" style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '32px', letterSpacing: '-0.02em', margin: 0 }}>Analytics & ESG Intelligence</h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600, margin: '4px 0 0' }}>Real-time Operations & Sustainability Dashboard</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46', fontWeight: 800, fontSize: '13px' }}>
          <ShieldCheck size={18} /> {esgData.certifiedGreenRating || 'AAA+ Scope-3 Eco-Certified'}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* ESG Scope 3 Sustainability Banner */}
        <div className="bento-box" style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6EE7B7' }}>
                <Leaf size={18} /> ESG Scope 3 Carbon Emissions Impact
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                {esgData.carbonSavedKg || 0} kg CO₂e Avoided
              </h2>
              <p style={{ margin: 0, color: '#A7F3D0', fontSize: '14px', fontWeight: 500 }}>
                STRIDE multi-warehouse routing reduced domestic transit carbon intensity by <strong>{esgData.carbonReductionPct || 0}%</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(8px)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#A7F3D0', fontWeight: 700 }}>EQUIVALENT TREES</div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px' }}>🌳 {esgData.treesEquivalent || 0}</div>
                <div style={{ fontSize: '11px', color: '#D1FAE5' }}>Carbon offset/yr</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(8px)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#A7F3D0', fontWeight: 700 }}>NET CARBON</div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px' }}>{esgData.totalCarbonKg || 0} <span style={{ fontSize: '14px' }}>kg</span></div>
                <div style={{ fontSize: '11px', color: '#D1FAE5' }}>Total emissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          
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
              <PieIcon size={20} color="var(--hot-pink)" /> Routing Distribution Breakdown
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

          {/* Carbon Comparison Bar Chart */}
          <div className="bento-box" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={20} color="#10B981" /> Carbon Emissions Comparison (kg CO₂e)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={esgComparison} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} />
                <Tooltip />
                <Bar dataKey="carbon" radius={[0, 6, 6, 0]}>
                  {esgComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stock Levels Bar Chart */}
          <div className="bento-box" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="var(--neon-orange)" /> Stock Levels by Warehouse × Product
            </h3>
            <ResponsiveContainer width="100%" height={260}>
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
    </div>
  );
}
