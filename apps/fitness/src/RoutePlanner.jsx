import { useState, useEffect, useRef } from 'react';
import { X, Undo2, Trash2, ChevronDown, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routeDistanceMeters } from './lib/geo';

// Full-screen route planner: tap the map to drop waypoints (start, any number
// of via-points, end), watch the distance update live, then name + save.
// Distance is straight-line between taps — a pragmatic first version; snapping
// to real roads via a directions API would be the upgrade path.

const FALLBACK_CENTER = [47.3769, 8.5417]; // Zürich — overridden by geolocation when available

export default function RoutePlanner({ activities, onSave, onClose }) {
  const [waypoints, setWaypoints] = useState([]);
  const [name, setName] = useState('');
  const [activity, setActivity] = useState(activities[0] || 'Running');

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const map = L.map(mapEl.current, { zoomControl: true }).setView(FALLBACK_CENTER, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e) => {
      setWaypoints(prev => [...prev, { latitude: e.latlng.lat, longitude: e.latlng.lng }]);
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
        () => {},
        { timeout: 4000 }
      );
    }
    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Redraw markers + polyline whenever waypoints change. circleMarkers avoid
  // Leaflet's bundler-hostile default icon assets entirely.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    waypoints.forEach((wp, i) => {
      const isStart = i === 0;
      const isEnd = i === waypoints.length - 1 && waypoints.length > 1;
      L.circleMarker([wp.latitude, wp.longitude], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
        fillColor: isStart ? '#16a34a' : isEnd ? '#dc2626' : '#2563eb'
      }).addTo(layer);
    });
    if (waypoints.length > 1) {
      L.polyline(waypoints.map(wp => [wp.latitude, wp.longitude]), {
        color: '#2563eb', weight: 4, opacity: 0.8
      }).addTo(layer);
    }
  }, [waypoints]);

  const distanceMeters = routeDistanceMeters(waypoints);
  const canSave = waypoints.length >= 2 && name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: Date.now(),
      name: name.trim(),
      activity,
      waypoints,
      distanceMeters: Math.round(distanceMeters),
      createdAt: Date.now()
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-gray-900 text-sm">Plan route</span>
        </div>
        <button onClick={onClose} className="text-gray-400 active:text-gray-600 p-1" aria-label="Close route planner">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <div ref={mapEl} className="absolute inset-0" />
        {/* Live distance readout */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg tabular-nums">
          {waypoints.length < 2
            ? `Tap the map to add points (${waypoints.length}/2 min)`
            : `${(distanceMeters / 1000).toFixed(2)} km · ${waypoints.length} points`}
        </div>
        {/* Undo / clear */}
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setWaypoints(p => p.slice(0, -1))}
            disabled={waypoints.length === 0}
            className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 disabled:opacity-40 active:bg-gray-100"
            aria-label="Undo last point"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWaypoints([])}
            disabled={waypoints.length === 0}
            className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-red-500 disabled:opacity-40 active:bg-gray-100"
            aria-label="Clear all points"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save form */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Route name (e.g. River loop)"
            className="flex-1 min-w-0 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="relative flex-shrink-0">
            <select
              value={activity}
              onChange={e => setActivity(e.target.value)}
              className="appearance-none bg-gray-100 rounded-xl pl-3 pr-8 py-3 text-sm text-gray-900 outline-none"
            >
              {activities.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={save}
          disabled={!canSave}
          className="w-full h-11 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:bg-blue-700"
        >
          Save route{waypoints.length >= 2 ? ` · ${(distanceMeters / 1000).toFixed(2)} km` : ''}
        </button>
      </div>
    </div>
  );
}
