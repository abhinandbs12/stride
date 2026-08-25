import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Activity, LayoutDashboard, BarChart3, Building2, Key, Truck, 
  LogOut, Shield, Zap, Sparkles, ExternalLink 
} from 'lucide-react';

export default function AppLayout({ children, token, setAuth }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setAuth(null);
    navigate('/login');
  };

  const navItems = [
    { label: 'Digital Twin Map', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Warehouse Station', path: '/station', icon: Building2 },
    { label: 'ESG & Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Developer Portal', path: '/developer', icon: Key },
    { label: 'Customer Tracker', path: '/track', icon: Truck },
  ];

  return (
    <div className="app-layout">
      <div className="app-ambient-glow" />

      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '38px', height: '38px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Activity size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
              STRIDE <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818CF8', fontWeight: 800 }}>PRO</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Autonomous Fulfillment</div>
          </div>
        </div>

        {/* Live System Status Pill */}
        <div style={{ padding: '14px 16px', margin: '14px 14px 6px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pulse-dot" style={{ background: '#10B981' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#34D399' }}>Cluster Active</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>8080-UP</span>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '10px 0', flex: 1 }}>
          <div style={{ padding: '0 20px 8px', fontSize: '11px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Platform Hubs
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: 'white' }}>
                AD
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Admin User</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>admin@stride.io</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: '8px', borderRadius: '8px', color: 'var(--text-muted)' }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>

          <a 
            href="/swagger-ui.html" 
            target="_blank" 
            rel="noreferrer" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 600, padding: '6px', borderRadius: '6px', background: 'var(--bg-surface)' }}
          >
            OpenAPI Specs <ExternalLink size={12} />
          </a>
        </div>

      </aside>

      {/* Main Screen Content */}
      <main className="app-main">
        {children}
      </main>

    </div>
  );
}
