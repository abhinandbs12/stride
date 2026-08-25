import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Key, ArrowLeft, Plus, Copy, Check, Trash2, Shield, Code, Terminal, ExternalLink 
} from 'lucide-react';

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '40px 24px' }}>
      
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} className="bento-btn-secondary" style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>B2B Developer Portal</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>API Keys, Webhooks & ERP Integration Tokens</p>
          </div>
        </div>

        <a href="/swagger-ui.html" target="_blank" rel="noreferrer" className="bento-btn-secondary" style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 700 }}>
          <Code size={15} /> OpenAPI Swagger <ExternalLink size={14} />
        </a>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Key Generator Card */}
        <div className="bento-box" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="var(--neon-orange)" /> Create New API Key
          </h3>
          <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="bento-input" 
              placeholder="Key Description / Integration Name (e.g. Shopify Production Store, SAP ERP Sync)..." 
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              style={{ flex: 1, height: '50px' }}
              required
            />
            <button type="submit" className="bento-btn" style={{ height: '50px', padding: '0 28px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={creating}>
              <Plus size={18} /> {creating ? 'Generating...' : 'Generate API Key'}
            </button>
          </form>

          {/* Just Generated Key Banner */}
          {newKeyResult && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#ECFDF5', border: '1px solid #10B981', borderRadius: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', marginBottom: '8px' }}>
                🎉 API Key Created! Copy it now as it won't be shown again:
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={newKeyResult.plainKey}
                  style={{ flex: 1, padding: '12px 16px', background: 'white', border: '1px solid #10B981', borderRadius: '10px', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#047857' }} 
                />
                <button 
                  type="button" 
                  onClick={() => handleCopy(newKeyResult.plainKey)} 
                  className="bento-btn" 
                  style={{ background: '#10B981', padding: '0 20px', height: '46px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active Keys List */}
        <div className="bento-box" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="#6366F1" /> Active API Keys
          </h3>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading keys...</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No API keys generated yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {keys.map(k => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {k.name}
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: k.active ? '#D1FAE5' : '#FEE2E2', color: k.active ? '#065F46' : '#991B1B', fontWeight: 800 }}>
                        {k.active ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'monospace' }}>
                      Prefix: <strong>{k.keyPrefix}</strong> • Role: {k.role} • Created: {new Date(k.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    {k.active && (
                      <button 
                        onClick={() => handleRevokeKey(k.id)}
                        className="bento-btn-secondary"
                        style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} /> Revoke Key
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration Quick Guide */}
        <div className="bento-box" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} color="var(--neon-orange)" /> How to Authenticate
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
            Pass your API key in the <code>X-API-Key</code> request header with every HTTP request:
          </p>
          <pre style={{ padding: '16px 20px', background: '#1E293B', color: '#38BDF8', borderRadius: '12px', fontSize: '13px', overflowX: 'auto', fontFamily: 'monospace' }}>
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

    </div>
  );
}
