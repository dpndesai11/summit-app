

export default function RouteThumb({ waypoints }) {
  const w = 72, h = 48, pad = 6;
  if (!waypoints || waypoints.length < 2) {
    return <div className="w-[72px] h-12 bg-gray-100 dark:bg-violet-400/10 rounded-lg" />;
  }
  const lats = waypoints.map(p => p.latitude);
  const lngs = waypoints.map(p => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  const pts = waypoints.map(p => {
    const x = pad + ((p.longitude - minLng) / spanLng) * (w - 2 * pad);
    const y = pad + ((maxLat - p.latitude) / spanLat) * (h - 2 * pad);
    return [x, y];
  });
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="bg-violet-50 dark:bg-violet-500/10 rounded-lg flex-shrink-0">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
      />
      <circle cx={sx} cy={sy} r="3" fill="#16a34a" />
      <circle cx={ex} cy={ey} r="3" fill="#dc2626" />
    </svg>
  );
}
