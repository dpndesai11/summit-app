// A tiny trend line for the exercise list: one point per day, the latest one dotted.
export default function Sparkline({ values, width = 72, height = 28 }) {
  if (!values || values.length === 0) return <span style={{ width }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0" aria-hidden="true">
      {pts.length > 1 && (
        <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="stroke-violet-500" />
      )}
      <circle cx={lx} cy={ly} r="3" className="fill-violet-600" />
    </svg>
  );
}
