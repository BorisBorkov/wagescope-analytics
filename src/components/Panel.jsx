import { useId, useState } from 'react';
import { useSettings } from '../settings.jsx';
import { DataTable } from './DataTable.jsx';
import { Legend } from './Legend.jsx';

/**
 * One chart with its title, one-line reading note, legend, source and a table view
 * (the accessible twin of the chart — every value is reachable without hovering).
 */
export function Panel({ title, note, legend, source, table, size, children }) {
  const { t } = useSettings();
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <section className={`panel${size ? ` panel--${size}` : ''}`} aria-labelledby={id}>
      <header className="panel__head">
        <div>
          <h3 id={id}>{title}</h3>
          {note && <p className="panel__note">{note}</p>}
        </div>
        {table && (
          <button type="button" className="chip" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? t('panel.chart') : t('panel.table')}
          </button>
        )}
      </header>
      {legend && !showTable && <Legend items={legend} />}
      <div className="panel__body">{showTable ? <DataTable {...table} /> : children}</div>
      {source && <p className="panel__source">{t('panel.source')}: {source}</p>}
    </section>
  );
}
