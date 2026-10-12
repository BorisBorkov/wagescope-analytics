/** Plain table view of a chart's data. columns: [{ key, label, format?, align? }] */
export function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap" tabIndex={0}>
      <table className="data-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.align === 'left' ? 'left' : undefined}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c, j) => {
                const v = c.format ? c.format(row[c.key], row) : row[c.key];
                return j === 0
                  ? <th key={c.key} scope="row" className="left">{v}</th>
                  : <td key={c.key} className={c.align === 'left' ? 'left' : undefined}>{v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
