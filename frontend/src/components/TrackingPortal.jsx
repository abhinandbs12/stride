import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle2, Clock, MapPin, Search, 
  ArrowLeft, FileText, ExternalLink, ShieldCheck, Leaf, Activity 
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SHIPPED': return { class: 'badge-green', label: 'IN TRANSIT' };
      case 'DELIVERED': return { class: 'badge-blue', label: 'DELIVERED' };
      case 'PICKED': return { class: 'badge-amber', label: 'PACKED & READY' };
      case 'ALLOCATED':
      case 'ROUTED_FULL': return { class: 'badge-purple', label: 'ALLOCATED TO HUB' };
      default: return { class: 'badge-blue', label: status || 'PROCESSING' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', padding: '40px 24px', position: 'relative' }}>
      <div className="app-ambient-glow" />

      {/* Top Bar */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC' }}>STRIDE DirectTrack</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Global Freight Telemetry</div>
          </div>
        </div>

        <Link to="/dashboard" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back to Console
        </Link>
      </div>

      {/* Tracking Input Search Hero */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 28px' }}>
        <div className="glass-card" style={{ padding: '24px 32px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter Tracking Number (e.g. TRK-...) or Order ID..." 
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ paddingLeft: '44px', height: '48px', fontSize: '14px' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ height: '48px', padding: '0 28px' }} disabled={loading}>
              {loading ? 'Locating...' : 'Track Package'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: '1000px', margin: '0 auto 24px', padding: '16px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#FB7185', fontSize: '13px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Tracking Details View */}
      {data && (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Shipment Status Card */}
          <div className="glass-card animate-fade-in" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TRACKING IDENTIFIER
                </div>
                <h2 className="mono" style={{ fontSize: '28px', color: '#818CF8', margin: '4px 0 2px', letterSpacing: '0.02em' }}>
                  {data.trackingNumber}
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Carrier: <strong>{data.carrier}</strong> • {data.transportMode || 'Standard Ground Fleet'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {(() => {
                  const badge = getStatusBadge(data.status);
                  return (
                    <span className={`status-badge ${badge.class}`} style={{ fontSize: '13px', padding: '6px 16px' }}>
                      {badge.label}
                    </span>
                  );
                })()}
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                  Order: {data.orderId.substring(0, 8)}...
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>ORIGIN FULFILLMENT HUB</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>{data.originWarehouse}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.originAddress}</div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>DESTINATION ADDRESS</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>{data.customerName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{data.destinationAddress}</div>
              </div>

              <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700 }}>PARCEL CONTENTS</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>{data.itemCount} Units</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Insured Freight</div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 700 }}>🌱 SCOPE-3 ESG CARBON</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>
                  {data.carbonKg || '0.12'} kg CO₂e
                </div>
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>100% Certified Offset</div>
              </div>
            </div>

            {/* Shipment Milestones Timeline */}
            <div>
              <h3 style={{ fontSize: '16px', margin: '0 0 20px', color: 'var(--text-main)' }}>Shipment Journey Milestones</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(99, 102, 241, 0.3)', marginLeft: '10px' }}>
                {data.milestones.map((m, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', left: '-31px', top: '2px', width: '12px', height: '12px', 
                      borderRadius: '50%', background: m.completed ? '#6366F1' : 'var(--bg-surface)',
                      border: m.completed ? '2px solid #818CF8' : '2px solid var(--border-subtle)',
                      boxShadow: m.completed ? '0 0 10px rgba(99, 102, 241, 0.6)' : 'none'
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: m.completed ? 'var(--text-main)' : 'var(--text-dim)' }}>
                        {m.title}
                      </div>
                      {m.timestamp && (
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          {new Date(m.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: m.completed ? 'var(--text-muted)' : 'var(--text-dim)', marginTop: '2px' }}>
                      {m.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Route Journey Map */}
          <div className="glass-card" style={{ padding: '24px', height: '360px', position: 'relative' }}>
            <MapContainer 
              center={[(data.originLat + data.destLat) / 2, (data.originLng + data.destLng) / 2]} 
              zoom={4} 
              style={{ width: '100%', height: '100%', borderRadius: '14px' }} 
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              
              {/* Origin Marker */}
              <CircleMarker center={[data.originLat, data.originLng]} radius={10} pathOptions={{ color: '#6366F1', fillColor: '#818CF8', fillOpacity: 0.9 }}>
                <Popup><strong>Origin:</strong> {data.originWarehouse}</Popup>
              </CircleMarker>

              {/* Destination Marker */}
              <CircleMarker center={[data.destLat, data.destLng]} radius={10} pathOptions={{ color: '#10B981', fillColor: '#34D399', fillOpacity: 0.9 }}>
                <Popup><strong>Destination:</strong> {data.customerName}</Popup>
              </CircleMarker>

              {/* Line */}
              <Polyline 
                positions={[[data.originLat, data.originLng], [data.destLat, data.destLng]]} 
                pathOptions={{ color: '#6366F1', weight: 4, dashArray: '6, 8' }} 
              />
            </MapContainer>
          </div>

        </div>
      )}

    </div>
  );
}
