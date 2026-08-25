import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, Scan, CheckCircle2, PackageCheck, Truck, 
  FileText, RefreshCw, Barcode, AlertCircle, ArrowRightLeft, X, Layers 
} from 'lucide-react';
import AppLayout from './AppLayout';

export default function WarehouseStation({ token, setAuth }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Transfer Form State
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState(10);

  const scanInputRef = useRef(null);

  const fetchStationData = async () => {
    try {
      const [whRes, ordRes, prodRes, trfRes] = await Promise.all([
        fetch('/api/v1/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders?size=50&sort=createdAt,desc', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/stock/transfers', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (whRes.status === 401) {
        setAuth(null);
        navigate('/login');
        return;
      }

      const whData = await whRes.json();
      const ordData = await ordRes.json();
      const prodData = await prodRes.json();
      const trfData = await trfRes.json();

      const whList = whData.content || whData;
      setWarehouses(whList);
      if (!selectedWarehouseId && whList.length > 0) {
        setSelectedWarehouseId(whList[0].id);
      }

      const pList = prodData.content || prodData;
      setProducts(pList);
      if (!transferProductId && pList.length > 0) {
        setTransferProductId(pList[0].id);
      }

      setOrders(ordData.content || ordData);
      setTransfers(Array.isArray(trfData) ? trfData : []);
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
    fetchStationData();
    const interval = setInterval(fetchStationData, 4000);
    return () => clearInterval(interval);
  }, [token, navigate, setAuth]);

  // Extract all allocations for current selected warehouse
  const activeAllocations = [];
  orders.forEach(order => {
    order.lines?.forEach(line => {
      line.allocations?.forEach(alloc => {
        if (!selectedWarehouseId || alloc.warehouseId === selectedWarehouseId) {
          activeAllocations.push({
            orderId: order.id,
            orderStatus: order.status,
            customerName: order.customer?.name || 'Customer',
            lineId: line.id,
            productId: line.productId,
            productName: line.productName || 'Inventory Item',
            allocationId: alloc.id,
            quantity: alloc.quantityAllocated,
            status: alloc.status || 'ALLOCATED',
            createdAt: order.createdAt
          });
        }
      });
    });
  });

  const handlePick = async (orderId, allocationId) => {
    setActionLoading(prev => ({ ...prev, [allocationId]: true }));
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/allocations/${allocationId}/pick`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Pick operation failed');
      
      setScanMessage({ type: 'success', text: `Allocation #${allocationId.substring(0, 8)} verified and marked PICKED!` });
      await fetchStationData();
    } catch (err) {
      setScanMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [allocationId]: false }));
    }
  };

  const handleShipAndPrint = async (orderId, allocationId) => {
    setActionLoading(prev => ({ ...prev, [allocationId]: true }));
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/allocations/${allocationId}/ship`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ship operation failed');

      // Auto-open PDF shipping label in background tab
      window.open(`/api/v1/orders/${orderId}/allocations/${allocationId}/label`, '_blank');
      
      setScanMessage({ type: 'success', text: `Allocation dispatched into carrier transit & 4x6 label generated!` });
      await fetchStationData();
    } catch (err) {
      setScanMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [allocationId]: false }));
    }
  };

  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseId || !transferTargetId || !transferProductId) return;
    try {
      const res = await fetch('/api/v1/stock/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceWarehouseId: selectedWarehouseId,
          targetWarehouseId: transferTargetId,
          productId: transferProductId,
          quantity: parseInt(transferQty)
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Transfer failed');
      }

      setShowTransferModal(false);
      setScanMessage({ type: 'success', text: 'Cross-Dock Transfer dispatched into transit!' });
      await fetchStationData();
    } catch (err) {
      alert('Transfer error: ' + err.message);
    }
  };

  const handleCompleteTransfer = async (transferId) => {
    setActionLoading(prev => ({ ...prev, [transferId]: true }));
    try {
      const res = await fetch(`/api/v1/stock/transfers/${transferId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Complete transfer failed');
      setScanMessage({ type: 'success', text: 'Transfer received & added to local inventory!' });
      await fetchStationData();
    } catch (err) {
      setScanMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [transferId]: false }));
    }
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const barcode = scanInput.trim().toUpperCase();
    if (!barcode) return;

    const match = activeAllocations.find(a => 
      a.allocationId.toUpperCase().startsWith(barcode) || 
      a.orderId.toUpperCase().startsWith(barcode) ||
      barcode.includes(a.allocationId.substring(0, 8).toUpperCase())
    );

    if (match) {
      if (match.status === 'ALLOCATED') {
        handlePick(match.orderId, match.allocationId);
      } else if (match.status === 'PICKED') {
        handleShipAndPrint(match.orderId, match.allocationId);
      } else {
        setScanMessage({ type: 'info', text: `Item is already ${match.status}` });
      }
    } else {
      setScanMessage({ type: 'error', text: `No active allocation found matching barcode: ${barcode}` });
    }
    setScanInput('');
  };

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  const pendingPickCount = activeAllocations.filter(a => a.status === 'ALLOCATED').length;
  const readyToShipCount = activeAllocations.filter(a => a.status === 'PICKED').length;
  const shippedCount = activeAllocations.filter(a => a.status === 'SHIPPED').length;

  const relevantTransfers = transfers.filter(t => 
    t.sourceWarehouseId === selectedWarehouseId || t.targetWarehouseId === selectedWarehouseId
  );

  return (
    <AppLayout token={token} setAuth={setAuth}>
      
      {/* Top Header */}
      <div className="app-header">
        <div>
          <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>Warehouse Floor Terminal</h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            Active Station: <strong style={{ color: '#818CF8' }}>{selectedWarehouse?.name || 'All Nodes'}</strong>
          </p>
        </div>

        {/* Node Switcher & Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowTransferModal(true)} 
            className="btn-primary" 
            style={{ padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
          >
            <ArrowRightLeft size={15} /> Transfer Stock
          </button>
          
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            {warehouses.map(wh => (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouseId(wh.id)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: selectedWarehouseId === wh.id ? 'var(--brand-primary)' : 'transparent',
                  color: selectedWarehouseId === wh.id ? 'white' : 'var(--text-muted)'
                }}
              >
                {wh.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* KPI Counter Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', padding: '14px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <PackageCheck size={26} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Queued to Pick</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{pendingPickCount}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '14px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <Scan size={26} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Ready to Pack & Ship</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{readyToShipCount}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', padding: '14px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Truck size={26} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Carrier Dispatched</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{shippedCount}</div>
            </div>
          </div>
        </div>

        {/* Laser / USB Barcode Scanner Bar */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <form onSubmit={handleBarcodeScan} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'white', padding: '12px', borderRadius: '10px' }}>
              <Barcode size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <input 
                ref={scanInputRef}
                type="text" 
                className="form-input" 
                placeholder="Scan or type Barcode / Allocation ID to auto-verify..." 
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                style={{ height: '48px', fontSize: '14px' }}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary" style={{ height: '48px', padding: '0 24px' }}>
              Process Scan
            </button>
          </form>

          {scanMessage && (
            <div style={{ 
              marginTop: '12px', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
              background: scanMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : scanMessage.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              color: scanMessage.type === 'success' ? '#34D399' : scanMessage.type === 'error' ? '#FB7185' : '#818CF8',
              border: scanMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : scanMessage.type === 'error' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              {scanMessage.text}
            </div>
          )}
        </div>

        {/* Live Pick & Pack Work Queue */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#818CF8" /> Live Pick & Dispatch Queue
            </h3>
            <button onClick={fetchStationData} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {activeAllocations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              No active pick orders queued for {selectedWarehouse?.name || 'this node'}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeAllocations.map(item => (
                <div key={item.allocationId} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '16px 20px', background: 'var(--bg-surface)', borderRadius: '12px', 
                  border: item.status === 'ALLOCATED' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-subtle)'
                }}>
                  
                  {/* Item Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className={`status-badge ${item.status === 'SHIPPED' ? 'badge-green' : item.status === 'PICKED' ? 'badge-blue' : 'badge-amber'}`}>
                      {item.status}
                    </span>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                        <span style={{ color: '#818CF8' }}>{item.quantity}x</span> {item.productName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', fontFamily: 'monospace' }}>
                        ALLOC: {item.allocationId.substring(0, 8)} • ORDER: {item.orderId.substring(0, 8)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {item.status === 'ALLOCATED' && (
                      <button 
                        onClick={() => handlePick(item.orderId, item.allocationId)}
                        disabled={actionLoading[item.allocationId]}
                        className="btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        {actionLoading[item.allocationId] ? 'Picking...' : '✓ Pick Item'}
                      </button>
                    )}

                    {item.status === 'PICKED' && (
                      <button 
                        onClick={() => handleShipAndPrint(item.orderId, item.allocationId)}
                        disabled={actionLoading[item.allocationId]}
                        className="btn-primary" 
                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '8px 16px', fontSize: '13px' }}
                      >
                        {actionLoading[item.allocationId] ? 'Dispatching...' : '📦 Pack & Ship + Print'}
                      </button>
                    )}

                    {item.status === 'SHIPPED' && (
                      <a 
                        href={`/api/v1/orders/${item.orderId}/allocations/${item.allocationId}/label`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <FileText size={14} /> Reprint Label
                      </a>
                    )}

                    <Link 
                      to={`/track/${item.orderId}`}
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                      title="Public Customer Tracker"
                    >
                      <Truck size={14} />
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inter-Warehouse Cross-Dock Transfers Queue */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '17px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} color="#C084FC" /> Inter-Hub Stock Transfers
          </h3>

          {relevantTransfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
              No active cross-dock transfers for this fulfillment node.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {relevantTransfers.map(trf => (
                <div key={trf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      <span style={{ color: '#C084FC' }}>{trf.quantity}x</span> {trf.productName} ({trf.sku})
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      From: <strong>{trf.sourceWarehouseName}</strong> ➔ To: <strong>{trf.targetWarehouseName}</strong> • Ref: <span className="mono">{trf.trackingRef}</span>
                    </div>
                  </div>

                  <div>
                    {trf.status === 'IN_TRANSIT' && trf.targetWarehouseId === selectedWarehouseId ? (
                      <button 
                        onClick={() => handleCompleteTransfer(trf.id)}
                        disabled={actionLoading[trf.id]}
                        className="btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '12px', background: 'linear-gradient(135deg, #10B981, #059669)' }}
                      >
                        {actionLoading[trf.id] ? 'Ingesting...' : '✓ Ingest Stock'}
                      </button>
                    ) : (
                      <span className={`status-badge ${trf.status === 'COMPLETED' ? 'badge-green' : 'badge-purple'}`}>
                        {trf.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Transfer Stock Modal */}
      {showTransferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={18} color="#C084FC" /> Initiate Inter-Hub Transfer
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInitiateTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>SOURCE HUB</label>
                <input type="text" className="form-input" value={selectedWarehouse?.name || ''} disabled style={{ opacity: 0.6 }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>DESTINATION HUB</label>
                <select className="form-select" value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)} required>
                  <option value="">Select Destination...</option>
                  {warehouses.filter(w => w.id !== selectedWarehouseId).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>SKU ITEM</label>
                <select className="form-select" value={transferProductId} onChange={e => setTransferProductId(e.target.value)} required>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>TRANSFER QUANTITY</label>
                <input type="number" className="form-input" min="1" max="500" value={transferQty} onChange={e => setTransferQty(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                  Dispatch Transfer
                </button>
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
