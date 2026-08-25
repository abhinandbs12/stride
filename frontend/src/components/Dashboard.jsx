import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Building2, Layers, Cpu, Zap, Leaf, RefreshCw, FileText, 
  Truck, ArrowRight, CheckCircle2, AlertTriangle, Play, X 
} from 'lucide-react';
import AppLayout from './AppLayout';

const WAREHOUSE_COORDS = {
  'Central Hub': [41.8781, -87.6298],       // Chicago
  'East Coast Node': [40.7128, -74.0060],   // New York
  'West Coast Node': [34.0522, -118.2437]   // Los Angeles
};

export default function Dashboard({ token, setAuth }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stockByWarehouse, setStockByWarehouse] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order Simulator State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderResult, setOrderResult] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [ecoMode, setEcoMode] = useState(true);

  // Stress Test State
  const [stressTesting, setStressTesting] = useState(false);
  const [stressCount, setStressCount] = useState(10);
  const [stressResult, setStressResult] = useState(null);

  // Map Animation State
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const fetchData = async () => {
    try {
      const [whRes, prRes, ordRes, stockRes, trfRes] = await Promise.all([
        fetch('/api/v1/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders?size=15&sort=createdAt,desc', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/stock?size=1000', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/stock/transfers', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (whRes.status === 401) {
        setAuth(null);
        navigate('/login');
        return;
      }

      const whData = await whRes.json();
      const prData = await prRes.json();
      const ordData = await ordRes.json();
      const stockData = await stockRes.json();
      const trfData = await trfRes.json();

      const whList = whData.content || whData;
      const prList = prData.content || prData;

      setWarehouses(whList);
      setProducts(prList);
      if (!selectedProduct && prList.length > 0) {
        setSelectedProduct(prList[0].id);
      }

      setOrders(ordData.content || ordData);
      setTransfers(Array.isArray(trfData) ? trfData : []);

      const stockItems = stockData.content || stockData;
      const groupedStock = {};
      stockItems.forEach(item => {
        if (!groupedStock[item.warehouseId]) {
          groupedStock[item.warehouseId] = [];
        }
        groupedStock[item.warehouseId].push(item);
      });
      setStockByWarehouse(groupedStock);
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
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [token, navigate, setAuth]);

  const handlePlaceOrder = async () => {
    if (!selectedProduct) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: '8f3b2075-81fa-4f91-9e23-74a6bfb3017a',
          lines: [{ productId: selectedProduct, quantity: parseInt(quantity) }]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Routing failed');
      }

      const data = await res.json();
      setOrderResult(data);

      // Trigger map route animation
      if (data.lines && data.lines.length > 0 && data.lines[0].allocations?.length > 0) {
        const alloc = data.lines[0].allocations[0];
        const wh = warehouses.find(w => w.id === alloc.warehouseId);
        if (wh && WAREHOUSE_COORDS[wh.name]) {
          const start = WAREHOUSE_COORDS[wh.name];
          const end = [data.customer?.latitude || 45.5152, data.customer?.longitude || -122.6784];
          const newRoute = { id: Date.now(), start, end };
          setActiveRoutes(prev => [...prev, newRoute]);
          setTimeout(() => {
            setActiveRoutes(prev => prev.filter(r => r.id !== newRoute.id));
          }, 4500);
        }
      }

      await fetchData();
    } catch (err) {
      setOrderResult({ error: err.message });
    } finally {
      setPlacing(false);
    }
  };

  const handleStressTest = async () => {
    setStressTesting(true);
    setStressResult(null);
    try {
      const prodId = selectedProduct || (products[0] ? products[0].id : '6b9e73b2-e192-4f81-a67b-12d7bf394e11');
      const res = await fetch(`/api/v1/orders/stress-test?count=${stressCount}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: '8f3b2075-81fa-4f91-9e23-74a6bfb3017a',
          lines: [{ productId: prodId, quantity: 1 }]
        })
      });

      if (!res.ok) throw new Error('Stress test execution failed');
      const data = await res.json();
      setStressResult(data);
      await fetchData();
    } catch (err) {
      setStressResult({ error: err.message });
    } finally {
      setStressTesting(false);
    }
  };

  // Calculate cluster stats
  let totalAvailableStock = 0;
  Object.values(stockByWarehouse).forEach(items => {
    items.forEach(i => { totalAvailableStock += (i.availableToPromise || 0); });
  });

  return (
    <AppLayout token={token} setAuth={setAuth}>
      
      {/* Top Telemetry Header */}
      <div className="app-header">
        <div>
          <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 800 }}>Digital Twin Control Center</h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Real-time inventory topology and multi-factor routing engine</p>
        </div>

        {/* Global Cluster KPIs */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>ACTIVE HUBS</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8' }}>{warehouses.length} Nodes</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>AVAILABLE STOCK</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#34D399' }}>{totalAvailableStock} Units</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <button 
            onClick={fetchData} 
            className="btn-secondary" 
            style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}
            title="Refresh Cluster Telemetry"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Split Screen */}
      <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', flex: 1, minHeight: 'calc(100vh - 70px)' }}>
        
        {/* Left Side: Operations & Simulator Panel */}
        <div style={{ 
          padding: '28px', borderRight: '1px solid var(--border-subtle)', 
          display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--bg-sidebar)',
          overflowY: 'auto'
        }}>
          
          {/* Order Simulation & Concurrency Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#818CF8" />
                <h2 style={{ fontSize: '17px', margin: 0 }}>Intelligent Routing Simulator</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setEcoMode(!ecoMode)}
                style={{ 
                  background: ecoMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: ecoMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                  color: ecoMode ? '#34D399' : 'var(--text-dim)',
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Leaf size={12} /> {ecoMode ? 'Eco-Routing ON' : 'Eco-Routing OFF'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Target SKU
                </label>
                <select 
                  className="form-select" 
                  value={selectedProduct} 
                  onChange={e => setSelectedProduct(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Quantity
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="500" 
                    className="form-input" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    onClick={handlePlaceOrder} 
                    className="btn-primary" 
                    style={{ width: '100%', height: '46px' }}
                    disabled={placing || !selectedProduct}
                  >
                    {placing ? 'Optimizing...' : '⚡ Route Order'}
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Result Box */}
            {orderResult && (
              <div style={{ marginTop: '18px', padding: '16px', borderRadius: '12px', background: orderResult.error ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)', border: orderResult.error ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)' }}>
                {orderResult.error ? (
                  <div style={{ color: '#FB7185', fontSize: '13px', fontWeight: 600 }}>⚠️ {orderResult.error}</div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#818CF8' }}>ROUTED SUCCESSFULLY</span>
                      <span className="status-badge badge-green">{orderResult.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                      Order Ref: <span className="mono" style={{ color: '#38BDF8' }}>{orderResult.id.substring(0, 8)}...</span>
                      {orderResult.lines?.[0]?.allocations?.[0] && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                          Allocated <strong>{orderResult.lines[0].allocations[0].quantityAllocated} units</strong> from {warehouses.find(w => w.id === orderResult.lines[0].allocations[0].warehouseId)?.name || 'Central Hub'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stress Test Section */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>CONCURRENCY STRESS TEST</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>@Version Lock</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[10, 25, 50].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setStressCount(cnt)}
                    className={stressCount === cnt ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    {cnt}x
                  </button>
                ))}
                <button
                  onClick={handleStressTest}
                  disabled={stressTesting}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', padding: '0 16px', fontSize: '12px', borderRadius: '8px' }}
                >
                  {stressTesting ? 'Firing...' : 'Fire'}
                </button>
              </div>

              {stressResult && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '12px', color: '#FBBF24' }}>
                  Fired <strong>{stressResult.totalAttempted || stressCount}</strong> concurrent orders • <strong>{stressResult.successfulAllocations || 0}</strong> fulfilled • <strong>{stressResult.concurrencyErrorsPrevented || 0}</strong> overselling collisions stopped.
                </div>
              )}
            </div>

          </div>

          {/* Real-time Order Stream */}
          <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#38BDF8" />
                <h3 style={{ fontSize: '16px', margin: 0 }}>Live Fulfillment Feed</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Latest {orders.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders.slice(0, 8).map(ord => (
                <div key={ord.id} style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        #{ord.id.substring(0, 6)}
                      </span>
                      <span className={`status-badge ${ord.status === 'ALLOCATED' || ord.status === 'SHIPPED' ? 'badge-green' : ord.status === 'PARTIALLY_ALLOCATED' ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {ord.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {ord.customer?.name || 'Customer'} • {ord.lines?.length || 1} SKUs
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a 
                      href={`/api/v1/orders/${ord.id}/label`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ padding: '6px 8px', borderRadius: '6px', color: 'var(--text-muted)' }}
                      title="Download 4x6 Thermal Label"
                    >
                      <FileText size={14} />
                    </a>
                    <Link 
                      to={`/track/${ord.id}`}
                      className="btn-secondary"
                      style={{ padding: '6px 8px', borderRadius: '6px', color: '#818CF8' }}
                      title="Live Public Tracker"
                    >
                      <Truck size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Leaflet Digital Twin Map */}
        <div style={{ position: 'relative', height: '100%', minHeight: '600px' }}>
          <MapContainer 
            center={[39.8283, -98.5795]} 
            zoom={4} 
            style={{ width: '100%', height: '100%', background: '#090D16' }} 
            zoomControl={false}
          >
            {/* CartoDB Voyager / Dark Matter Tile Layer */}
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            />
            
            {/* Warehouses Circle Nodes */}
            {warehouses.map(wh => {
              const coords = WAREHOUSE_COORDS[wh.name];
              if (!coords) return null;
              const stockItems = stockByWarehouse[wh.id] || [];
              const totalStock = stockItems.reduce((acc, s) => acc + (s.availableToPromise || 0), 0);
              return (
                <CircleMarker 
                  key={wh.id} 
                  center={coords} 
                  radius={14} 
                  pathOptions={{ color: '#6366F1', fillColor: '#818CF8', fillOpacity: 0.85, weight: 3 }}
                  eventHandlers={{ click: () => setSelectedWarehouse(wh) }}
                >
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#F8FAFC' }}>{wh.name}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{wh.address}</div>
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Available Stock:</span>
                        <strong style={{ color: '#10B981' }}>{totalStock} units</strong>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Active Real-time Delivery Trajectories */}
            {activeRoutes.map(route => (
              <Polyline 
                key={route.id} 
                positions={[route.start, route.end]} 
                pathOptions={{ color: '#6366F1', weight: 4, dashArray: '8, 8' }} 
              />
            ))}

            {/* Inter-Hub Stock Transfers */}
            {transfers.filter(t => t.status === 'IN_TRANSIT').map(t => {
              const start = WAREHOUSE_COORDS[t.sourceWarehouseName];
              const end = WAREHOUSE_COORDS[t.targetWarehouseName];
              if (!start || !end) return null;
              return (
                <Polyline 
                  key={t.id} 
                  positions={[start, end]} 
                  pathOptions={{ color: '#A855F7', weight: 4, dashArray: '6, 10' }} 
                />
              );
            })}
          </MapContainer>

          {/* Map Overlay Badge */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 400, background: 'rgba(14, 21, 38, 0.85)', backdropFilter: 'blur(12px)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="pulse-dot" style={{ background: '#6366F1' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>Digital Twin Network Topology</div>
          </div>
        </div>

      </div>

      {/* Warehouse Inventory Drilldown Modal */}
      {selectedWarehouse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '32px', background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', margin: 0 }}>{selectedWarehouse.name}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Stock Capacity Drilldown</p>
              </div>
              <button onClick={() => setSelectedWarehouse(null)} className="btn-secondary" style={{ padding: '6px', borderRadius: '8px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {(stockByWarehouse[selectedWarehouse.id] || []).map(stock => {
                const prod = products.find(p => p.id === stock.productId);
                return (
                  <div key={stock.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{prod?.name || 'Item'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>SKU: {prod?.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#34D399', fontWeight: 800, fontSize: '15px' }}>{stock.availableToPromise}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Reserved: {stock.reservedQuantity}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
