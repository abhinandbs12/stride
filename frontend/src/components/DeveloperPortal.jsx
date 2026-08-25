import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Key, Plus, Copy, Check, Trash2, Shield, Code, Terminal, ExternalLink, RefreshCw 
} from 'lucide-react';
import AppLayout from './AppLayout';

export default function DeveloperPortal({ token, setAuth }) {
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/developer/keys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        setAuth(null);
        navigate('/login');
        return;
      }
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchKeys();
  }, [token, navigate, setAuth]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: keyName.trim(), role: 'ADMIN' })
      });
      if (!res.ok) throw new Error('Failed to generate key');
      const data = await res.json();
      setNewKeyResult(data);
      setKeyName('');
      await fetchKeys();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? External systems using it will lose access immediately.')) return;
    try {
      const res = await fetch(`/api/v1/developer/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Revocation failed');
      await fetchKeys();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AppLayout token={token} setAuth={setAuth}>
      
      {/* Top Header */}
      <div className="app-header">
        <div>
          <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>B2B Developer Portal</h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Programmatic API keys, webhook integrations & ERP authentication</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/swagger-ui.html" target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Code size={14} /> Swagger UI <ExternalLink size={12} />
          </a>
          <button onClick={fetchKeys} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Create API Key Box */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} color="#818CF8" /> Generate Enterprise Integration Key
          </h3>
          <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Integration Name (e.g. Shopify US Store, SAP ERP Sync, 3PL Partner)..." 
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              style={{ flex: 1, height: '46px' }}
              required
            />
            <button type="submit" className="btn-primary" style={{ height: '46px', padding: '0 24px', whiteSpace: 'nowrap' }} disabled={creating}>
              <Plus size={16} /> {creating ? 'Generating...' : 'Generate Key'}
            </button>
          </form>

          {/* New Key Revealed Banner */}
          {newKeyResult && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#34D399', marginBottom: '8px' }}>
                🎉 API Key Generated! Copy it now as it cannot be shown again:
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={newKeyResult.plainKey}
                  style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#34D399' }} 
                />
                <button 
                  type="button" 
                  onClick={() => handleCopy(newKeyResult.plainKey)} 
                  className="btn-primary" 
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '0 16px', height: '42px', fontSize: '13px' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Keys List */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#38BDF8" /> Active API Keys
          </h3>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading API keys...</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>No API keys created yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {keys.map(k => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {k.name}
                      <span className={`status-badge ${k.active ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {k.active ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', fontFamily: 'monospace' }}>
                      Prefix: <strong>{k.keyPrefix}</strong> • Role: {k.role} • Created: {new Date(k.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    {k.active && (
                      <button 
                        onClick={() => handleRevokeKey(k.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#FB7185' }}
                      >
                        <Trash2 size={13} /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration cURL Guide */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="#FBBF24" /> Authentication Reference
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Include your API key in the <code>X-API-Key</code> request header:
          </p>
          <pre style={{ padding: '14px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: '#38BDF8', borderRadius: '10px', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
{`curl -X POST http://localhost:8080/api/v1/orders \\
  -H "X-API-Key: stride_live_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerId": "8f3b2075-81fa-4f91-9e23-74a6bfb3017a",
    "lines": [{"productId": "6b9e73b2-e192-4f81-a67b-12d7bf394e11", "quantity": 5}]
  }'`}
          </pre>
        </div>

      </div>

    </AppLayout>
  );
}
