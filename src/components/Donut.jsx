import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useSettings } from '../settings.jsx';

/**
 * Part-to-whole donut (≤ 6 segments) with the values listed beside it, so the numbers are
 * readable without hovering. rows: [{ key, label, value, color }]
 */
export function Donut({ rows, format, center, centerLabel }) {
  const { colors, f } = useSettings();
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="donut">
      <div className="donut__chart">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="96%"
              startAngle={90} endAngle={-270} stroke={colors.surface} strokeWidth={2} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.key} fill={r.color} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <div className="tooltip">
                <div className="tooltip__row">
                  <svg width="12" height="8" aria-hidden="true"><rect x="1" y="0" width="10" height="8" rx="2" fill={payload[0].payload.color} /></svg>
                  <strong>{f.pct(payload[0].value / total * 100)}</strong>
                  <span>{payload[0].payload.label}</span>
                </div>
              </div>
            ) : null} />
          </PieChart>
        </ResponsiveContainer>
        {center && (
          <div className="donut__center" aria-hidden="true">
            <strong>{center}</strong>
            <span>{centerLabel}</span>
          </div>
        )}
      </div>
      <ul className="donut__list">
        {rows.map((r) => (
          <li key={r.key}>
            <svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2" fill={r.color} /></svg>
            <span className="donut__name">{r.label}</span>
            <strong>{f.pct(r.value / total * 100)}</strong>
            {format && <span className="donut__value">{format(r.value)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
