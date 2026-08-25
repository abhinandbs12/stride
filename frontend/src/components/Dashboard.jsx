import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, LogOut, Navigation, CheckCircle, Clock, X, Zap, Activity } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const WAREHOUSE_COORDS = {
  'Central Hub': [41.8781, -87.6298],
  'East Coast Distribution': [40.7357, -74.1724],
  'West Coast Fulfillment': [34.0522, -118.2437]
};

const TiltBox = ({ children, className, style, onClick }) => {
  const boxRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    
    boxRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!boxRef.current) return;
    boxRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
  };

  return (
    <div 
      ref={boxRef}
      className={`bento-box ${className || ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </div>
  );
};

export default function Dashboard({ token, setAuth }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stockByWarehouse, setStockByWarehouse] = useState({});
  const [loading, setLoading] = useState(true);

  // Order Simulator State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderResult, setOrderResult] = useState(null);
  const [placing, setPlacing] = useState(false);
  
  // Stress Test State
  const [stressTesting, setStressTesting] = useState(false);
  const [stressCount, setStressCount] = useState(10);

  // Map Animation State
  const [activeRoutes, setActiveRoutes] = useState([]);

  // Modal State
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const fetchData = async () => {
    try {
      const [whRes, prRes, ordRes, stockRes] = await Promise.all([
        fetch('/api/v1/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders?size=15&sort=createdAt,desc', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/stock?size=1000', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (whRes.status === 401) {
        setAuth(null);
        return;
      }

      const whData = await whRes.json();
      const prData = await prRes.json();
      const ordData = await ordRes.json();
      const stockData = await stockRes.json();

      setWarehouses(whData.content || whData);
      setProducts(prData.content || prData);
      setOrders(ordData.content || ordData);

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
    // Auto refresh data every 3 seconds for stress test monitoring
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [token, navigate, setAuth]);

  const handleLogout = () => {
    setAuth(null);
    navigate('/login');
  };
  
  const triggerMapAnimation = (orderData) => {
    // Basic mapping animation from warehouse to random customer location near center US
    if(!orderData.lines || !orderData.lines[0] || !orderData.lines[0].allocations) return;
    
    const customerLat = 38.0 + (Math.random() * 4 - 2);
    const customerLng = -95.0 + (Math.random() * 10 - 5);
    const cLoc = [customerLat, customerLng];

    const newRoutes = orderData.lines[0].allocations.map(a => {
      const wh = warehouses.find(w => w.id === a.warehouseId);
      const start = WAREHOUSE_COORDS[wh?.name] || [40, -100];
      return { id: Math.random(), start, end: cLoc };
    });

    setActiveRoutes(prev => [...prev, ...newRoutes]);
    setTimeout(() => {
      setActiveRoutes(prev => prev.filter(r => !newRoutes.find(nr => nr.id === r.id)));
    }, 3000);
  };

  const handlePlaceOrder = async (e) => {
    if(e) e.preventDefault();
    setPlacing(true);
    setOrderResult(null);

    const orderReq = {
      customerId: "00000000-0000-0000-0000-000000000000",
      lines: [{ productId: selectedProduct, quantity: parseInt(quantity) }]
    };

    try {
      const cRes = await fetch('/api/v1/customers', { headers: { Authorization: `Bearer ${token}` } });
      const cData = await cRes.json();
      const customer = cData.content[0]; 
      orderReq.customerId = customer.id;

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(orderReq)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Routing failed');
      
      setOrderResult(data);
      triggerMapAnimation(data);
      await fetchData();
    } catch (err) {
      setOrderResult({ error: err.message });
    } finally {
      setPlacing(false);
    }
  };

  const handleStressTest = async (e) => {
    e.preventDefault();
    setStressTesting(true);
    const orderReq = {
      customerId: "00000000-0000-0000-0000-000000000000",
      lines: [{ productId: selectedProduct, quantity: parseInt(quantity) }]
    };

    try {
      const cRes = await fetch('/api/v1/customers', { headers: { Authorization: `Bearer ${token}` } });
      const cData = await cRes.json();
      orderReq.customerId = cData.content[0].id;

      await fetch(`/api/v1/orders/stress-test?count=${stressCount}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(orderReq)
      });
      // We don't await result since it's async in backend
    } catch (err) {
      console.error(err);
    } finally {
      setStressTesting(false);
    }
  };

  const getWarehouseFillPercentage = (warehouseId) => {
    const items = stockByWarehouse[warehouseId] || [];
    if (items.length === 0) return 0;
    const totalPhysical = items.reduce((sum, item) => sum + item.quantity, 0);
    const maxCapacity = items.length * 200;
    return Math.min(100, Math.round((totalPhysical / maxCapacity) * 100));
  };

  if (loading && warehouses.length === 0) return <div style={{ padding: '40px', fontSize: '24px', fontWeight: 'bold' }}>Initializing STRIDE Core...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      
      {/* Left Panel: Dashboard Data */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'var(--neon-orange)', color: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 20px rgba(255, 81, 47, 0.3)' }}>
              <Activity size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: 1 }}>STRIDE Console</h1>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Command Center</p>
            </div>
          </div>
          <button onClick={handleLogout} className="bento-btn-secondary" style={{ padding: '12px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <LogOut size={18} /> Exit
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          
          {/* Simulator & Stress Tester */}
          <TiltBox className="bento-large" style={{ gridColumn: '1 / -1', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Routing Engine</h2>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Simulate single orders or stress-test concurrent locking.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>PRODUCT</label>
                <select className="bento-input" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required>
                  <option value="">-- Choose an item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '100px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>QTY</label>
                <input type="number" min="1" max="1000" className="bento-input" value={quantity} onChange={e => setQuantity(e.target.value)} required />
              </div>

              <button onClick={handlePlaceOrder} className="bento-btn" style={{ height: '54px', padding: '0 32px' }} disabled={placing || !selectedProduct}>
                {placing ? 'Routing...' : '1x Route'}
              </button>
            </div>

            {/* Stress Test Options */}
            <div style={{ padding: '20px', background: 'rgba(255, 94, 98, 0.05)', border: '1px solid rgba(255, 94, 98, 0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Zap size={24} color="var(--neon-orange)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Stress Test Mode</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Launch concurrent API requests</div>
              </div>
              <input type="number" min="5" max="500" className="bento-input" style={{ width: '80px', height: '40px' }} value={stressCount} onChange={e => setStressCount(e.target.value)} />
              <button onClick={handleStressTest} className="bento-btn" style={{ background: 'linear-gradient(135deg, #ff0f7b, #f89b29)', height: '40px', padding: '0 24px' }} disabled={stressTesting || !selectedProduct}>
                Launch {stressCount}x
              </button>
            </div>
            
            {orderResult && !orderResult.error && (
              <div className="animate-fade-in" style={{ padding: '16px', background: '#D1FAE5', color: '#065F46', borderRadius: '12px', fontWeight: 600 }}>
                Single Route Success! Selected Node: {orderResult.lines?.[0]?.allocations?.map(a => warehouses.find(w => w.id === a.warehouseId)?.name).join(', ')}
              </div>
            )}
            {orderResult && orderResult.error && (
              <div className="animate-fade-in" style={{ padding: '16px', background: '#FEE2E2', color: '#991B1B', borderRadius: '12px', fontWeight: 600 }}>
                Error: {orderResult.error}
              </div>
            )}
          </TiltBox>

          {/* Warehouses */}
          {warehouses.map((wh) => {
            const fillPercent = getWarehouseFillPercentage(wh.id);
            return (
              <TiltBox key={wh.id} onClick={() => setSelectedWarehouse(wh)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{wh.name}</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>{wh.address}</p>
                  </div>
                </div>
                <div style={{ marginTop: 'auto' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px', fontWeight: 700 }}>
                     <span style={{ color: 'var(--text-secondary)' }}>Capacity</span>
                     <span style={{ color: 'var(--text-primary)' }}>{fillPercent}%</span>
                   </div>
                   <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                     <div style={{ width: `${fillPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-orange), var(--hot-pink))', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                   </div>
                </div>
              </TiltBox>
            );
          })}

          {/* Live Order Feed */}
          <TiltBox className="bento-wide" style={{ gridColumn: '1 / -1', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Live Order Feed (Auto-updating)
            </h3>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{order.id.split('-')[0]}</span>
                  <span style={{ color: order.status === 'ROUTED_FULL' ? '#059669' : order.status === 'CREATED' ? '#D97706' : '#DC2626' }}>{order.status}</span>
                </div>
              ))}
            </div>
          </TiltBox>

        </div>
      </div>

      {/* Right Panel: Map (Digital Twin) */}
      <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
        <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          
          {/* Warehouses */}
          {warehouses.map(wh => {
            const coords = WAREHOUSE_COORDS[wh.name];
            if (!coords) return null;
            const fill = getWarehouseFillPercentage(wh.id);
            return (
              <CircleMarker key={wh.id} center={coords} radius={12} pathOptions={{ color: 'var(--neon-orange)', fillColor: 'var(--hot-pink)', fillOpacity: 0.8 }}>
                <Popup>
                  <strong>{wh.name}</strong><br/>
                  Capacity: {fill}%
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Active Routes (Animation) */}
          {activeRoutes.map(route => (
            <Polyline key={route.id} positions={[route.start, route.end]} pathOptions={{ color: 'var(--neon-orange)', weight: 3, dashArray: '10, 10', className: 'route-animation' }} />
          ))}
        </MapContainer>

        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 400, background: 'rgba(255,255,255,0.9)', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', fontWeight: 700, fontSize: '14px' }}>
          STRIDE Digital Twin Map
        </div>
      </div>

      {/* Warehouse Modal */}
      {selectedWarehouse && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bento-box animate-fade-in" style={{ width: '500px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setSelectedWarehouse(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>{selectedWarehouse.name} Inventory</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(stockByWarehouse[selectedWarehouse.id] || []).map(stock => {
                const prod = products.find(p => p.id === stock.productId);
                return (
                  <div key={stock.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700 }}>{prod?.name}</div>
                    <div style={{ color: 'var(--neon-orange)', fontWeight: 800 }}>{stock.availableToPromise}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .route-animation {
          stroke-dashoffset: 1000;
          animation: dash 3s linear forwards;
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
      `}} />
    </div>
  );
}
