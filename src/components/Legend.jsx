/** Legend that mirrors the mark: a short stroke for lines, a swatch for bars and slices. */
export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label}>
          <svg width="16" height="10" aria-hidden="true">
            {item.shape === 'rect'
              ? <rect x="2" y="1" width="12" height="8" rx="2" fill={item.color} />
              : <line x1="1" y1="5" x2="15" y2="5" stroke={item.color} strokeOpacity={item.faded ? 0.45 : 1} strokeWidth={2.5} strokeLinecap="round" />}
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
