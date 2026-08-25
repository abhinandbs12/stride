import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, LogOut, Navigation, CheckCircle, Clock, X } from 'lucide-react';

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

  // Modal State
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const fetchData = async () => {
    try {
      const [whRes, prRes, ordRes, stockRes] = await Promise.all([
        fetch('/api/v1/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/orders?size=5&sort=createdAt,desc', { headers: { Authorization: `Bearer ${token}` } }),
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

      // Group stock by warehouse
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
  }, [token, navigate, setAuth]);

  const handleLogout = () => {
    setAuth(null);
    navigate('/login');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setPlacing(true);
    setOrderResult(null);

    const orderReq = {
      customerId: "00000000-0000-0000-0000-000000000000",
      lines: [
        {
          productId: selectedProduct,
          quantity: parseInt(quantity)
        }
      ]
    };

    try {
      const cRes = await fetch('/api/v1/customers', { headers: { Authorization: `Bearer ${token}` } });
      const cData = await cRes.json();
      const customer = cData.content[0]; 

      if(!customer) throw new Error("No customers found");
      orderReq.customerId = customer.id;

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderReq)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Routing failed');
      
      setOrderResult(data);
      // Automatically refresh data after routing
      await fetchData();
    } catch (err) {
      setOrderResult({ error: err.message });
    } finally {
      setPlacing(false);
    }
  };

  const getWarehouseFillPercentage = (warehouseId) => {
    const items = stockByWarehouse[warehouseId] || [];
    if (items.length === 0) return 0;
    // Simple heuristic: assuming max capacity is 200 per product for visual purposes
    const totalPhysical = items.reduce((sum, item) => sum + item.quantity, 0);
    const maxCapacity = items.length * 200;
    return Math.min(100, Math.round((totalPhysical / maxCapacity) * 100));
  };

  if (loading) return <div style={{ padding: '40px', fontSize: '24px', fontWeight: 'bold' }}>Initializing Core...</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '60px 20px', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--neon-orange)', color: 'white', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 20px rgba(255, 81, 47, 0.3)' }}>
            <Navigation size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '32px', letterSpacing: '-0.02em', lineHeight: 1 }}>STRIDE</h1>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Network Overview</p>
          </div>
        </div>
        
        <button onClick={handleLogout} className="bento-btn-secondary" style={{ padding: '12px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <div className="bento-container animate-fade-in">
        
        {/* Stat Box 1 */}
        <TiltBox className="bento-box">
          <h3 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>Active Nodes</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <span className="stat-massive">{warehouses.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: 600 }}>
            <MapPin size={16} /> Fully Operational
          </div>
        </TiltBox>

        {/* Stat Box 2 */}
        <TiltBox className="bento-box">
          <h3 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>Catalog Items</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <span className="stat-massive" style={{ background: 'linear-gradient(135deg, var(--neon-orange), var(--hot-pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{products.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: 600 }}>
            <Package size={16} /> Monitored SKUs
          </div>
        </TiltBox>

        {/* Recent Orders Feed */}
        <TiltBox className="bento-wide" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} /> Live Order Feed
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
            {orders.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)' }}>No recent orders found.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{order.id.split('-')[0]}</span>
                    <span>{order.lines.length} items</span>
                  </div>
                  <div style={{ padding: '4px 10px', borderRadius: '12px', background: order.status === 'ROUTED_FULL' ? '#D1FAE5' : order.status === 'CREATED' ? '#FEF3C7' : '#FEE2E2', color: order.status === 'ROUTED_FULL' ? '#065F46' : order.status === 'CREATED' ? '#92400E' : '#991B1B', fontSize: '12px' }}>
                    {order.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </TiltBox>

        {/* Order Simulator (Large) */}
        <TiltBox className="bento-large" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Routing Simulator</h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Test the multi-node allocation engine.</p>
          </div>
          
          <form onSubmit={handlePlaceOrder} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Product</label>
              <select className="bento-input" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required>
                <option value="">-- Choose an item --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1, minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantity</label>
              <input type="number" min="1" max="1000" className="bento-input" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </div>

            <button type="submit" className="bento-btn" style={{ height: '54px', padding: '0 32px' }} disabled={placing || !selectedProduct}>
              {placing ? 'Routing...' : 'Simulate'}
            </button>
          </form>

          {/* Results Area */}
          {orderResult && (
             <div className="animate-fade-in" style={{ marginTop: 'auto', padding: '24px', background: 'rgba(255,255,255,0.7)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,1)' }}>
                {orderResult.error ? (
                  <div style={{ color: 'var(--hot-pink)', fontWeight: 600 }}>Error: {orderResult.error}</div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 700, marginBottom: '16px', fontSize: '18px' }}>
                      <CheckCircle size={24} /> Optimized Route Generated
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {orderResult.lines?.[0]?.allocations?.map(a => {
                        const wh = warehouses.find(w => w.id === a.warehouseId);
                        return (
                          <div key={a.id} style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', fontWeight: 600, fontSize: '15px' }}>
                            <span style={{ color: 'var(--neon-orange)', fontSize: '18px', marginRight: '6px' }}>{a.quantityAllocated}x</span> from {wh?.name || a.warehouseId}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
             </div>
          )}
        </TiltBox>

        {/* Warehouses */}
        {warehouses.map((wh, idx) => {
          const fillPercent = getWarehouseFillPercentage(wh.id);
          return (
            <TiltBox key={wh.id} onClick={() => setSelectedWarehouse(wh)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{wh.name}</h3>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: 500 }}>{wh.address}</p>
                </div>
                <div style={{ background: 'var(--text-primary)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                  Active
                </div>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px', fontWeight: 700 }}>
                   <span style={{ color: 'var(--text-secondary)' }}>Capacity Load</span>
                   <span style={{ color: 'var(--text-primary)' }}>{fillPercent}%</span>
                 </div>
                 <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                   <div style={{ width: `${fillPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-orange), var(--hot-pink))', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                 </div>
                 <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'right' }}>Click to inspect inventory →</p>
              </div>
            </TiltBox>
          );
        })}

      </div>

      {/* Warehouse Inspection Modal */}
      {selectedWarehouse && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="bento-box animate-fade-in" style={{ maxWidth: '600px', width: '100%', padding: '40px', position: 'relative' }}>
            <button onClick={() => setSelectedWarehouse(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>{selectedWarehouse.name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Live Stock Inventory</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(stockByWarehouse[selectedWarehouse.id] || []).length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>No stock items found.</p>
              ) : (
                (stockByWarehouse[selectedWarehouse.id] || []).map(stock => {
                  const prod = products.find(p => p.id === stock.productId);
                  return (
                    <div key={stock.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.03)', padding: '16px', borderRadius: '16px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{prod?.name || stock.productId}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>SKU: {prod?.sku}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--neon-orange)' }}>{stock.available}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Available ({stock.reservedQuantity} reserved)</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
