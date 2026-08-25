import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, Scan, CheckCircle, PackageCheck, Truck, 
  FileText, ArrowLeft, RefreshCw, Barcode, AlertCircle 
} from 'lucide-react';

export default function WarehouseStation({ token, setAuth }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const scanInputRef = useRef(null);

  const fetchStationData = async () => {
    try {
      const [whRes, ordRes] = await Promise.all([
        fetch('/api/v1/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders?size=50&sort=createdAt,desc', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (whRes.status === 401) {
        setAuth(null);
        navigate('/login');
        return;
      }

      const whData = await whRes.json();
      const ordData = await ordRes.json();

      const whList = whData.content || whData;
      setWarehouses(whList);
      if (!selectedWarehouseId && whList.length > 0) {
        setSelectedWarehouseId(whList[0].id);
      }

      setOrders(ordData.content || ordData);
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
      
      setScanMessage({ type: 'success', text: `Allocation ${allocationId.substring(0, 8)} marked PICKED!` });
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

      // Auto-trigger PDF label download/print
      window.open(`/api/v1/orders/${orderId}/allocations/${allocationId}/label`, '_blank');
      
      setScanMessage({ type: 'success', text: `Allocation shipped & 4x6 label generated!` });
      await fetchStationData();
    } catch (err) {
      setScanMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [allocationId]: false }));
    }
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const barcode = scanInput.trim().toUpperCase();
    if (!barcode) return;

    // Search matching allocation by ID prefix or tracking prefix
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
      setScanMessage({ type: 'error', text: `No active allocation found for barcode: ${barcode}` });
    }
    setScanInput('');
  };

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);
  const pendingPickCount = activeAllocations.filter(a => a.status === 'ALLOCATED').length;
  const readyToShipCount = activeAllocations.filter(a => a.status === 'PICKED').length;
  const shippedCount = activeAllocations.filter(a => a.status === 'SHIPPED').length;

  if (loading && warehouses.length === 0) {
    return <div style={{ padding: '40px', fontSize: '24px', fontWeight: 'bold' }}>Connecting to Warehouse Station...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '40px 24px' }}>
      
      {/* Top Bar */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} className="bento-btn-secondary" style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Warehouse Pick & Pack Terminal</h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Floor Station: <strong>{selectedWarehouse?.name || 'All Nodes'}</strong></p>
          </div>
        </div>

        {/* Node Switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {warehouses.map(wh => (
            <button
              key={wh.id}
              onClick={() => setSelectedWarehouseId(wh.id)}
              className={selectedWarehouseId === wh.id ? 'bento-btn' : 'bento-btn-secondary'}
              style={{ padding: '10px 18px', borderRadius: '14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              {wh.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Metric Cards Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="bento-box" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#FEF3C7', color: '#92400E', padding: '14px', borderRadius: '16px' }}>
              <PackageCheck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>To Pick</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingPickCount}</div>
            </div>
          </div>

          <div className="bento-box" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#DBEAFE', color: '#1E40AF', padding: '14px', borderRadius: '16px' }}>
              <Scan size={28} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Ready To Ship</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{readyToShipCount}</div>
            </div>
          </div>

          <div className="bento-box" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#D1FAE5', color: '#065F46', padding: '14px', borderRadius: '16px' }}>
              <Truck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Dispatched</div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>{shippedCount}</div>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Bar */}
        <div className="bento-box" style={{ padding: '24px', background: 'white' }}>
          <form onSubmit={handleBarcodeScan} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--neon-orange)', color: 'white', padding: '12px', borderRadius: '12px' }}>
              <Barcode size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <input 
                ref={scanInputRef}
                type="text" 
                className="bento-input" 
                placeholder="Scan or type Barcode / Allocation ID to auto-pick or pack..." 
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                style={{ width: '100%', height: '52px', fontSize: '15px' }}
                autoFocus
              />
            </div>
            <button type="submit" className="bento-btn" style={{ height: '52px', padding: '0 28px' }}>
              Process Scan
            </button>
          </form>

          {scanMessage && (
            <div style={{ 
              marginTop: '14px', padding: '12px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
              background: scanMessage.type === 'success' ? '#D1FAE5' : scanMessage.type === 'error' ? '#FEE2E2' : '#EFF6FF',
              color: scanMessage.type === 'success' ? '#065F46' : scanMessage.type === 'error' ? '#991B1B' : '#1E40AF'
            }}>
              {scanMessage.text}
            </div>
          )}
        </div>

        {/* Live Pick & Pack Queue */}
        <div className="bento-box" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Active Pick & Dispatch Queue</h3>
            <button onClick={fetchStationData} className="bento-btn-secondary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {activeAllocations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No active allocations queued for this fulfillment node.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeAllocations.map(item => (
                <div key={item.allocationId} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '18px 24px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', 
                  border: item.status === 'ALLOCATED' ? '1px solid rgba(255, 81, 47, 0.3)' : '1px solid transparent'
                }}>
                  
                  {/* Item Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                      padding: '8px 14px', borderRadius: '12px', fontFamily: 'monospace', fontWeight: 800, fontSize: '13px',
                      background: item.status === 'SHIPPED' ? '#D1FAE5' : item.status === 'PICKED' ? '#DBEAFE' : '#FEF3C7',
                      color: item.status === 'SHIPPED' ? '#065F46' : item.status === 'PICKED' ? '#1E40AF' : '#92400E'
                    }}>
                      {item.status}
                    </div>

                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--neon-orange)' }}>{item.quantity}x</span> {item.productName}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'monospace' }}>
                        ALLOC: {item.allocationId.substring(0, 8)} • ORDER: {item.orderId.substring(0, 8)}
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {item.status === 'ALLOCATED' && (
                      <button 
                        onClick={() => handlePick(item.orderId, item.allocationId)}
                        disabled={actionLoading[item.allocationId]}
                        className="bento-btn" 
                        style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '13px' }}
                      >
                        {actionLoading[item.allocationId] ? 'Picking...' : '✓ Pick Item'}
                      </button>
                    )}

                    {item.status === 'PICKED' && (
                      <button 
                        onClick={() => handleShipAndPrint(item.orderId, item.allocationId)}
                        disabled={actionLoading[item.allocationId]}
                        className="bento-btn" 
                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '10px 20px', borderRadius: '12px', fontSize: '13px' }}
                      >
                        {actionLoading[item.allocationId] ? 'Dispatching...' : '📦 Pack & Ship + Print'}
                      </button>
                    )}

                    {item.status === 'SHIPPED' && (
                      <a 
                        href={`/api/v1/orders/${item.orderId}/allocations/${item.allocationId}/label`}
                        target="_blank"
                        rel="noreferrer"
                        className="bento-btn-secondary"
                        style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 700 }}
                      >
                        <FileText size={15} /> Reprint 4x6 Label
                      </a>
                    )}

                    <Link 
                      to={`/track/${item.orderId}`}
                      className="bento-btn-secondary"
                      style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                      title="View Public Tracking"
                    >
                      <Truck size={16} />
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
