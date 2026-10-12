/**
 * Recharts tooltip content: the value leads, the series name follows, keyed by a short
 * stroke of the series colour. `series` maps dataKey → { label, color }.
 */
export function ChartTooltip({ active, payload, label, series, format, labelFormat, extra }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && series[p.dataKey]);
  if (!rows.length) return null;
  return (
    <div className="tooltip" role="status">
      <div className="tooltip__title">{labelFormat ? labelFormat(label, payload[0].payload) : label}</div>
      {rows.map((p) => (
        <div className="tooltip__row" key={p.dataKey}>
          <svg width="12" height="8" aria-hidden="true"><line x1="1" y1="4" x2="11" y2="4" stroke={series[p.dataKey].color} strokeWidth="2.5" strokeLinecap="round" /></svg>
          <strong>{format(p.value, p.dataKey, p.payload)}</strong>
          <span>{series[p.dataKey].label}</span>
        </div>
      ))}
      {extra && <div className="tooltip__extra">{extra(payload[0].payload)}</div>}
    </div>
  );
}
