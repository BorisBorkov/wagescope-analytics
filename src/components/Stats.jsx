/** The headline row of a tab: one hero figure followed by a few supporting figures. */
export function StatRow({ hero, stats }) {
  return (
    <div className="stats">
      <div className="stat stat--hero">
        <div className="stat__label">{hero.label}</div>
        <div className="stat__value">{hero.value}</div>
        {hero.delta && <div className={`stat__delta stat__delta--${hero.delta.tone ?? 'neutral'}`}>{hero.delta.text}</div>}
        {hero.note && <div className="stat__note">{hero.note}</div>}
      </div>
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat__label">{s.label}</div>
          <div className="stat__value">{s.value}</div>
          {s.note && <div className="stat__note">{s.note}</div>}
        </div>
      ))}
    </div>
  );
}
