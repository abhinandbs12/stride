import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Activity, AlertCircle } from 'lucide-react';

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
      if (!res.ok) {
        throw new Error('Invalid email or password');
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '48px',
        position: 'relative'
      }}>
        
        {/* Floating Accent Sphere */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle at 30% 30%, #2ECAA3, #159C7B)',
          borderRadius: '50%',
          boxShadow: '0 10px 20px rgba(46, 202, 163, 0.3)',
          zIndex: -1,
          animation: 'float 6s ease-in-out infinite'
        }}></div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            color: 'var(--accent-mint)'
          }}>
            <Activity size={32} />
          </div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Welcome to STRIDE
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Enterprise Intelligent Order Routing
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {error && (
            <div style={{
              background: '#FFF0F0',
              color: 'var(--accent-rose)',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Password</label>
            <input 
              type="password" 
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          System initialized with default demo credentials.
        </div>
      </div>
    </div>
  );
}
