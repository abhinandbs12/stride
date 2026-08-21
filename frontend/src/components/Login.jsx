import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Activity, AlertCircle } from 'lucide-react';

export default function Login({ setAuth }) {
  const [email, setEmail] = useState('admin@stride.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    boxRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
  };

  const handleMouseLeave = () => {
    if (!boxRef.current) return;
    boxRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
  };

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
        throw new Error('Invalid email or password');
      } else if (!res.ok) {
        throw new Error(`Server error: Backend might be down (${res.status})`);
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
      <div 
        ref={boxRef}
        className="bento-box animate-fade-in" 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--neon-orange)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: '0 8px 25px rgba(255, 81, 47, 0.4)',
            color: 'white',
            transform: 'translateZ(20px)'
          }}>
            <Activity size={32} />
          </div>
          <h1 style={{ fontSize: '36px', color: 'var(--text-primary)', marginBottom: '8px', transform: 'translateZ(15px)' }}>
            STRIDE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, transform: 'translateZ(10px)' }}>
            Enterprise Intelligent Order Routing
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px', transform: 'translateZ(15px)' }}>
          {error && (
            <div style={{
              background: 'rgba(221, 36, 118, 0.1)',
              color: 'var(--hot-pink)',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Email Address</label>
            <input 
              type="email" 
              className="bento-input" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Password</label>
            <input 
              type="password" 
              className="bento-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="bento-btn" style={{ marginTop: '16px' }} disabled={loading}>
            {loading ? 'Authenticating...' : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500, transform: 'translateZ(5px)' }}>
          System initialized with default demo credentials.
        </div>
      </div>
    </div>
  );
}
