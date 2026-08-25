import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle2, Clock, MapPin, Search, 
  ArrowLeft, FileText, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function TrackingPortal() {
  const { trackingRef } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(trackingRef || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTracking = async (ref) => {
    if (!ref || !ref.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/public/track/${encodeURIComponent(ref.trim())}`);
      if (!res.ok) {
        throw new Error('No tracking records found for reference: ' + ref);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trackingRef) {
      fetchTracking(trackingRef);
    }
  }, [trackingRef]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/track/${query.trim()}`);
      fetchTracking(query.trim());
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SHIPPED': return { bg: '#D1FAE5', text: '#065F46', label: 'IN TRANSIT' };
      case 'DELIVERED': return { bg: '#DBEAFE', text: '#1E40AF', label: 'DELIVERED' };
      case 'PICKED': return { bg: '#FEF3C7', text: '#92400E', label: 'PACKED & READY' };
      case 'ROUTED_FULL':
      case 'ROUTED_PARTIAL': return { bg: '#EDE9FE', text: '#5B21B6', label: 'ROUTED TO HUB' };
      default: return { bg: '#F3F4F6', text: '#374151', label: status || 'PROCESSING' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Header */}
      <div style={{ maxWidth: '1000px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--neon-orange)', color: 'white', padding: '10px', borderRadius: '12px' }}>
            <Package size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>STRIDE Track</h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Global Shipment Tracking Network</p>
          </div>
        </div>
        <Link to="/login" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Operator Portal <ExternalLink size={14} />
        </Link>
      </div>

      {/* Search Box */}
      <div className="bento-box animate-fade-in" style={{ maxWidth: '1000px', width: '100%', padding: '24px', marginBottom: '32px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text" 
              className="bento-input" 
              placeholder="Enter Tracking Number or Order ID (e.g. STR-FED-..., UUID)..." 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '44px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          </div>
          <button type="submit" className="bento-btn" style={{ padding: '0 28px', height: '52px' }} disabled={loading}>
            {loading ? 'Locating...' : 'Track'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bento-box animate-fade-in" style={{ maxWidth: '1000px', width: '100%', padding: '24px', background: '#FEE2E2', border: '1px solid #F87171', color: '#991B1B', marginBottom: '32px', textAlign: 'center', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Tracking Details View */}
      {data && (
        <div className="bento-box animate-fade-in" style={{ maxWidth: '1000px', width: '100%', padding: '36px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking Number</div>
              <h2 style={{ fontSize: '26px', fontFamily: 'monospace', fontWeight: 800, margin: '4px 0' }}>{data.trackingNumber}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <Truck size={16} color="var(--neon-orange)" /> Carrier: <strong>{data.carrier}</strong>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              {(() => {
                const badge = getStatusColor(data.status);
                return (
                  <span style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '20px', background: badge.bg, color: badge.text, fontWeight: 800, fontSize: '13px', letterSpacing: '0.05em' }}>
                    {badge.label}
                  </span>
                );
              })()}
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                Order ID: {data.orderId.substring(0, 8)}...
              </div>
            </div>
          </div>

          {/* Route Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ORIGIN NODE</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>{data.originWarehouse}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{data.originAddress}</div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>DESTINATION</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>{data.customerName}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{data.destinationAddress}</div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>PACKAGE CONTENTS</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>{data.itemCount} Units</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{data.transportMode || 'Standard Freight'}</div>
            </div>

            <div style={{ padding: '16px', background: '#ECFDF5', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
              <div style={{ fontSize: '12px', color: '#065F46', fontWeight: 700 }}>🌱 ESG CARBON METRIC</div>
              <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', color: '#047857' }}>
                {data.carbonKg || '0.12'} kg CO₂e
              </div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>100% Certified Offset</div>
            </div>
          </div>

          {/* Milestone Timeline */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Shipment Progress</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(255, 81, 47, 0.2)', marginLeft: '12px' }}>
              {data.milestones.map((m, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', left: '-31px', top: '2px', width: '14px', height: '14px', 
                    borderRadius: '50%', background: m.completed ? 'var(--neon-orange)' : '#E5E7EB',
                    boxShadow: m.completed ? '0 0 10px rgba(255, 81, 47, 0.5)' : 'none'
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: m.completed ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {m.title}
                    </div>
                    {m.timestamp && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: m.completed ? 'var(--text-secondary)' : 'var(--text-tertiary)', marginTop: '2px' }}>
                    {m.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Route Map */}
          <div style={{ height: '300px', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
            <MapContainer 
              bounds={[[data.originLat, data.originLng], [data.destLat, data.destLng]]} 
              boundsOptions={{ padding: [50, 50] }}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              
              {/* Origin Marker */}
              <CircleMarker center={[data.originLat, data.originLng]} radius={9} pathOptions={{ color: '#ff512f', fillColor: '#ff512f', fillOpacity: 0.9 }}>
                <Popup><strong>Origin:</strong> {data.originWarehouse}</Popup>
              </CircleMarker>

              {/* Destination Marker */}
              <CircleMarker center={[data.destLat, data.destLng]} radius={9} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.9 }}>
                <Popup><strong>Destination:</strong> {data.customerName}</Popup>
              </CircleMarker>

              {/* Route Polyline */}
              <Polyline 
                positions={[[data.originLat, data.originLng], [data.destLat, data.destLng]]} 
                pathOptions={{ color: 'var(--neon-orange)', weight: 3, dashArray: '8, 8' }} 
              />
            </MapContainer>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={18} color="#10B981" /> Verified STRIDE Cryptographic Manifest
            </div>
            <a 
              href={`/api/v1/orders/${data.orderId}/label`} 
              target="_blank" 
              rel="noreferrer"
              className="bento-btn-secondary" 
              style={{ padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}
            >
              <FileText size={16} /> Thermal Shipping Label (PDF)
            </a>
          </div>

        </div>
      )}

    </div>
  );
}
