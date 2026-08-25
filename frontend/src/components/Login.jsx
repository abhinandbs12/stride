import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

export default function Login({ setAuth }) {
  const [email, setEmail] = useState('admin@stride.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.status === 401) {
        throw new Error('Invalid credentials. Please verify email and password.');
      } else if (!res.ok) {
        throw new Error(`Connection error (${res.status}). Ensure backend is active.`);
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

  const handleAutofill = () => {
    setEmail('admin@stride.com');
    setPassword('password123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      <div className="app-ambient-glow" />

      <div className="glass-card animate-fade-in" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '44px 38px',
        background: 'rgba(14, 21, 38, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(99, 102, 241, 0.25)'
      }}>
        
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)'
          }}>
            <Activity size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '28px', color: '#F8FAFC', marginBottom: '6px', letterSpacing: '-0.03em' }}>
            STRIDE Console
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
            Autonomous Multi-Node Fulfillment Platform
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#FB7185',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-dim)' }} />
              <input 
                type="email" 
                className="form-input" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: '40px', height: '46px' }}
                placeholder="name@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-dim)' }} />
              <input 
                type="password" 
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', height: '46px' }}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ height: '48px', marginTop: '8px', fontSize: '15px' }} 
            disabled={loading}
          >
            {loading ? 'Verifying Security Context...' : (
              <>
                Sign In to Console <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick Fill Pill */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#10B981" /> Demo Access Active
          </div>
          <button 
            type="button" 
            onClick={handleAutofill}
            style={{ background: 'none', border: 'none', color: '#818CF8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Sparkles size={13} /> Fill Demo Admin
          </button>
        </div>

      </div>
    </div>
  );
}
