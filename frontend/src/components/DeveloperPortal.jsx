import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Plus, Trash2, Copy, Check, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from './AppLayout';
import { cn } from '@/lib/utils';

export default function DeveloperPortal({ token, setAuth }) {
  const navigate = useNavigate();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/developer/keys', { headers });
      if (!res.ok) { setAuth(null); navigate('/login'); return; }
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchKeys();
  }, [token]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/developer/keys', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, role: 'ADMIN' }),
      });
      if (!res.ok) throw new Error('Failed to create key');
      const data = await res.json();
      setNewKey(data);
      setNewKeyName('');
      fetchKeys();
    } catch (e) { alert(e.message); }
    setCreating(false);
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await fetch(`/api/v1/developer/keys/${id}`, { method: 'DELETE', headers });
      fetchKeys();
    } catch (e) { alert(e.message); }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const apiEndpoints = [
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Authenticate and get JWT token' },
    { method: 'GET', path: '/api/v1/warehouses', desc: 'List all active warehouse nodes' },
    { method: 'GET', path: '/api/v1/products', desc: 'List product catalog' },
    { method: 'GET', path: '/api/v1/orders', desc: 'List orders with pagination' },
    { method: 'POST', path: '/api/v1/orders', desc: 'Place order with multi-node routing' },
    { method: 'POST', path: '/api/v1/orders/:id/allocations/:aid/pick', desc: 'Pick allocation at warehouse' },
    { method: 'POST', path: '/api/v1/orders/:id/allocations/:aid/ship', desc: 'Ship allocation with label' },
    { method: 'GET', path: '/api/v1/stock', desc: 'Query stock levels' },
    { method: 'GET', path: '/api/v1/public/track/:ref', desc: 'Public tracking (no auth)' },
    { method: 'POST', path: '/api/v1/orders/stress-test', desc: 'Concurrency stress test' },
  ];

  return (
    <AppLayout token={token} setAuth={setAuth}>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Developer API Portal</h2>
          <p className="text-xs text-gray-500">API keys, endpoint reference, and integration guides</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchKeys}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
        </Button>
      </div>

      {/* Create key */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Key size={15} className="text-[#D22B2B]"/> Generate API Key</h3>
        <div className="flex gap-2">
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. Production Backend)"
            className="flex-1 h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/15 focus:border-[#D22B2B]"/>
          <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
            <Plus size={14}/> {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
        {newKey && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">⚠ Copy this key — it won't be shown again</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-emerald-900 bg-emerald-100 px-2 py-1.5 rounded-lg break-all">{newKey.rawKey || newKey.key || JSON.stringify(newKey)}</code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKey.rawKey || newKey.key, 'new')}>
                {copied === 'new' ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Existing keys */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm mb-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Shield size={15} className="text-[#D22B2B]"/> Active Keys</h3>
        {keys.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">No API keys generated yet</div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{k.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">{k.prefix}••••••••  ·  {k.role}  ·  Created {new Date(k.createdAt).toLocaleDateString()}</div>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleRevoke(k.id)}>
                  <Trash2 size={12}/> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Reference */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">API Endpoint Reference</h3>
        <div className="space-y-1.5">
          {apiEndpoints.map((ep, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold font-mono',
                ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>
                {ep.method}
              </span>
              <code className="text-xs font-mono text-gray-800 flex-1">{ep.path}</code>
              <span className="text-[10px] text-gray-500 hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
