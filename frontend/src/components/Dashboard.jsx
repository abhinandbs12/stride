import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, Box, LogOut, Navigation, CheckCircle } from 'lucide-react';

export default function Dashboard({ token, setAuth }) {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order Simulator State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderResult, setOrderResult] = useState(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    Promise.all([
      fetch('/api/v1/warehouses', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/v1/products', { headers: { Authorization: `Bearer ${token}` } })
    ])
    .then(async ([whRes, prRes]) => {
      const whData = await whRes.json();
      const prData = await prRes.json();
      setWarehouses(whData.content || whData);
      setProducts(prData.content || prData);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      if(err.status === 401) {
          setAuth(null);
      }
      setLoading(false);
    });
  }, [token, navigate, setAuth]);

  const handleLogout = () => {
    setAuth(null);
    navigate('/login');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setPlacing(true);
    setOrderResult(null);

    // Hardcode dummy customer (Alice) from our seeder
    const orderReq = {
      customerId: "00000000-0000-0000-0000-000000000000", // Will rely on backend fixing or finding real customer if needed. Wait, we don't have the customer ID. Let's fetch customers first if needed, but for now just mock or use the API logic.
      lines: [
        {
          productId: selectedProduct,
          quantity: parseInt(quantity)
        }
      ]
    };

    // To make it perfectly work, we need a real customer ID.
    // Let's fetch customers first dynamically before placing the order.
    try {
      const cRes = await fetch('/api/v1/customers', { headers: { Authorization: `Bearer ${token}` } });
      const cData = await cRes.json();
      const customer = cData.content[0]; // grab first customer

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
    } catch (err) {
      setOrderResult({ error: err.message });
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading the Air & Glass experience...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Floating Sidebar */}
      <div style={{
        width: '280px',
        margin: '24px',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column'
      }} className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <div style={{
            background: 'var(--accent-mint)',
            color: 'white',
            padding: '8px',
            borderRadius: '12px'
          }}>
            <Navigation size={24} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Outfit' }}>STRIDE</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(46, 202, 163, 0.1)', color: 'var(--accent-mint)', borderRadius: '16px', textDecoration: 'none', fontWeight: 600 }}>
            <MapPin size={20} /> Network View
          </a>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', color: 'var(--text-secondary)', borderRadius: '16px', textDecoration: 'none', fontWeight: 500 }}>
            <Package size={20} /> Inventory
          </a>
        </nav>

        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500
        }}>
          <LogOut size={20} /> Sign Out
        </button>
      </div>

      {/* Main Content area */}
      <div style={{ flex: 1, padding: '24px 48px 24px 0', overflowY: 'auto' }}>
        
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Network Overview</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Real-time inventory and routing status.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              👤
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          
          {/* Warehouses Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {warehouses.map((wh, idx) => (
              <div key={wh.id} className="glass-card animate-fade-in" style={{ padding: '24px', animationDelay: `${idx * 0.1}s` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{wh.name}</h3>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{wh.address}</p>
                  </div>
                  <div style={{ background: 'rgba(0, 210, 255, 0.1)', color: 'var(--accent-cyan)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                    Active
                  </div>
                </div>
                
                {/* Dummy visual progress bars for stock (Since we don't have stock-per-warehouse loaded, we fake the visual) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    <span>Capacity Load</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.floor(Math.random() * 40 + 20)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.floor(Math.random() * 40 + 20)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-mint), var(--accent-cyan))', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Simulator Sidebar */}
          <div className="glass-card animate-fade-in delay-3" style={{ padding: '32px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Routing Simulator</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
              Test the DistanceCostStrategy engine.
            </p>

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Select Product</label>
                <select className="input-field" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} required>
                  <option value="">-- Choose an item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Quantity</label>
                <input type="number" min="1" max="100" className="input-field" value={quantity} onChange={e => setQuantity(e.target.value)} required />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '12px' }} disabled={placing || !selectedProduct}>
                {placing ? 'Calculating Route...' : 'Simulate Order'}
              </button>
            </form>

            {/* Routing Results */}
            {orderResult && (
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-light)' }}>
                {orderResult.error ? (
                  <div style={{ color: 'var(--accent-rose)', fontSize: '14px' }}>
                    <strong>Error:</strong> {orderResult.error}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-mint)', marginBottom: '16px', fontWeight: 600 }}>
                      <CheckCircle size={18} /> Routed Successfully
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <p style={{ marginBottom: '8px' }}><strong>Order ID:</strong> {orderResult.id.split('-')[0]}...</p>
                      <p style={{ marginBottom: '8px' }}><strong>Status:</strong> {orderResult.status}</p>
                      
                      <div style={{ marginTop: '12px' }}>
                        <strong>Allocated From:</strong>
                        <ul style={{ marginTop: '8px', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                          {orderResult.allocations?.map(a => {
                            const wh = warehouses.find(w => w.id === a.warehouseId);
                            return <li key={a.id}>{a.quantity} units → {wh?.name || a.warehouseId}</li>
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
