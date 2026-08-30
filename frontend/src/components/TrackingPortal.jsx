import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Search, Package, CheckCircle2, Truck, MapPin, Clock, Leaf, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TrackingPortal() {
  const { trackingRef: paramRef } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(paramRef || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (ref) => {
    const q = (ref || query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/v1/public/track/${encodeURIComponent(q)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Shipment not found');
      }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { if (paramRef) handleTrack(paramRef); }, [paramRef]);

  const STATUS_ICON = { CREATED: Clock, CONFIRMED: Package, ALLOCATED: Package, PICKED: CheckCircle2, SHIPPED: Truck, DELIVERED: CheckCircle2, CANCELLED: Clock };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
          <div className="w-10 h-10 rounded-xl bg-[#D22B2B] flex items-center justify-center shadow-md shadow-red-400/20">
            <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
              <path d="M14 3L4 9v10l10 6 10-6V9L14 3z" stroke="white" strokeWidth="2.5" fill="white" fillOpacity=".15"/>
              <path d="M14 25V14M24 9l-10 5L4 9" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span className="text-lg font-extrabold text-gray-900">STRIDE</span>
            <span className="text-xs text-gray-500 ml-2">Public Shipment Tracker</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
          <ArrowLeft size={14}/> Back to Portal
        </Button>
      </header>

      {/* Search */}
      <div className="px-8 mb-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-1">Track Your Shipment</h2>
          <p className="text-sm text-gray-500 text-center mb-5">Enter your order ID or tracking reference</p>
          <form onSubmit={(e) => { e.preventDefault(); handleTrack(); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter order ID or tracking ref..."
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D22B2B]/20 focus:border-[#D22B2B] shadow-sm"/>
            </div>
            <Button size="lg" disabled={loading}>{loading ? 'Searching...' : 'Track'}</Button>
          </form>
          {error && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 text-center">{error}</div>}
        </div>
      </div>

      {/* Result */}
      {result && (
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="px-8 pb-10">
          <div className="max-w-4xl mx-auto space-y-5">

            {/* Summary card */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-bold text-gray-900 font-mono">{result.trackingNumber}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{result.carrier} · {result.transportMode}</div>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold',
                  result.status === 'SHIPPED' || result.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200')}>
                  {result.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-500 font-medium mb-0.5">Items</div>
                  <div className="text-base font-bold text-gray-900">{result.itemCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-500 font-medium mb-0.5">Origin</div>
                  <div className="text-sm font-bold text-gray-900">{result.originWarehouse}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-500 font-medium mb-0.5">Destination</div>
                  <div className="text-sm font-bold text-gray-900">{result.customerName}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-emerald-700 font-medium mb-0.5 flex items-center gap-1"><Leaf size={11}/> Carbon</div>
                  <div className="text-sm font-bold text-emerald-900">{result.carbonKg} kg CO₂</div>
                  {result.carbonOffsetCertified && <div className="text-[9px] text-emerald-600 font-semibold">✓ Offset Certified</div>}
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="h-56 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <MapContainer center={[(result.originLat + result.destLat) / 2, (result.originLng + result.destLng) / 2]} zoom={5}
                style={{width:'100%',height:'100%'}} zoomControl={true}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"/>
                <CircleMarker center={[result.originLat, result.originLng]} radius={7}
                  pathOptions={{color:'#D22B2B',fillColor:'#D22B2B',fillOpacity:0.9}}>
                  <Popup><span className="text-xs font-bold">{result.originWarehouse}</span></Popup>
                </CircleMarker>
                <CircleMarker center={[result.destLat, result.destLng]} radius={7}
                  pathOptions={{color:'#3B82F6',fillColor:'#3B82F6',fillOpacity:0.9}}>
                  <Popup><span className="text-xs font-bold">{result.customerName}</span></Popup>
                </CircleMarker>
                <Polyline positions={[[result.originLat, result.originLng], [result.destLat, result.destLng]]}
                  pathOptions={{color:'#D22B2B',weight:3,dashArray:'8,8'}}/>
              </MapContainer>
            </div>

            {/* Timeline */}
            <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Tracking Timeline</h3>
              <div className="space-y-0">
                {result.milestones?.map((m, i) => {
                  const Icon = m.completed ? CheckCircle2 : Clock;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0',
                          m.completed ? 'bg-[#D22B2B] border-[#D22B2B] text-white' : 'bg-white border-gray-300 text-gray-400')}>
                          <Icon size={13}/>
                        </div>
                        {i < result.milestones.length - 1 && (
                          <div className={cn('w-0.5 h-10', m.completed ? 'bg-[#D22B2B]' : 'bg-gray-200')}/>
                        )}
                      </div>
                      <div className="pb-6">
                        <div className={cn('text-sm font-semibold', m.completed ? 'text-gray-900' : 'text-gray-400')}>{m.title}</div>
                        <div className="text-[11px] text-gray-500">{m.description}</div>
                        {m.timestamp && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{new Date(m.timestamp).toLocaleString()}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
