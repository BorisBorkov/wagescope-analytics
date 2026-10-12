import { useEffect, useRef, useState } from 'react';
import sources from './data/sources.json';
import { useSettings } from './settings.jsx';
import Salaries from './tabs/Salaries.jsx';
import Inflation from './tabs/Inflation.jsx';
import PurchasingPower from './tabs/PurchasingPower.jsx';
import Conclusion from './tabs/Conclusion.jsx';

const TABS = [
  { id: 'salaries', label: 'tabs.salaries', Component: Salaries },
  { id: 'inflation', label: 'tabs.inflation', Component: Inflation },
  { id: 'purchasing', label: 'tabs.purchasing', Component: PurchasingPower },
  { id: 'conclusion', label: 'tabs.conclusion', Component: Conclusion },
];
const fromHash = () => TABS.find((x) => `#${x.id}` === window.location.hash)?.id ?? TABS[0].id;

export default function App() {
  const { t, lang, setLang, currency, setCurrency, theme, setTheme } = useSettings();
  const [tab, setTab] = useState(fromHash);
  const tabRefs = useRef({});

  useEffect(() => {
    const onHash = () => setTab(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id, focus = false) => {
    setTab(id);
    if (window.location.hash !== `#${id}`) window.history.replaceState(null, '', `#${id}`);
    if (focus) tabRefs.current[id]?.focus();
    window.scrollTo({ top: 0 });
  };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKey = (e) => {
    const i = TABS.findIndex((x) => x.id === tab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next == null) return;
    e.preventDefault();
    go(TABS[(next + TABS.length) % TABS.length].id, true);
  };

  const Active = TABS.find((x) => x.id === tab).Component;
  const asOf = lang === 'bg' ? sources.builtAt.split('-').reverse().join('.') : sources.builtAt;

  return (
    <div className="app">
      <header className="top">
        <div className="top__inner">
          <div className="brand">
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
          <div className="controls">
            <Segmented label={t('controls.currency')} value={currency} onChange={setCurrency}
              options={[{ value: 'EUR', label: '€' }, { value: 'BGN', label: lang === 'bg' ? 'лв.' : 'BGN' }]} />
            <Segmented label={t('controls.language')} value={lang} onChange={setLang}
              options={[{ value: 'bg', label: 'BG' }, { value: 'en', label: 'EN' }]} />
            <Segmented label={t('controls.theme')} value={theme} onChange={setTheme}
              options={['auto', 'light', 'dark'].map((v) => ({ value: v, label: t(`controls.theme.${v}`) }))} />
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label={t('app.title')} onKeyDown={onKey}>
          {TABS.map((x, i) => (
            <button key={x.id} ref={(el) => { tabRefs.current[x.id] = el; }} type="button" role="tab" id={`tab-${x.id}`}
              aria-selected={tab === x.id} aria-controls={`panel-${x.id}`} tabIndex={tab === x.id ? 0 : -1}
              className="tab" onClick={() => go(x.id)}>
              <span className="tab__num">{i + 1}</span>{t(x.label)}
            </button>
          ))}
        </nav>
      </header>

      <main id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="main">
        <Active onNavigate={go} />
      </main>

      <footer className="foot">
        <span>{t('app.dataAsOf', { date: asOf })}</span>
        <span>{t('app.footerSources')}</span>
      </footer>
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : undefined} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
