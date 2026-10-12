import inflation from '../data/inflation.json';
import pp from '../data/purchasing-power.json';
import salaries from '../data/salaries.json';
import sources from '../data/sources.json';
import { useSettings } from '../settings.jsx';

const ORIGINS = ['o1', 'o2', 'o3', 'o4'];
const STEPS = ['s1', 's2', 's3', 's4'];
const eurostatDatasets = sources.list.filter((s) => s.code).length;

// `backticked` parts of a string render as code (file names, commands).
const rich = (text) => text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));

/** Every figure on this page is computed from the same JSON the charts use. */
export default function Conclusion({ onNavigate }) {
  const { t, f, lang } = useSettings();

  const q = salaries.quarterly.at(-1);
  const real = pp.realWages.at(-1);
  const growth = pp.realGrowthQuarterly;
  const eu = pp.euComparison.bulgaria;
  const monthly = inflation.monthly;
  const peak = monthly.reduce((a, b) => (b.bulgaria > a.bulgaria ? b : a));
  const low = monthly.filter((r) => r.month > peak.month).reduce((a, b) => (b.bulgaria < a.bulgaria ? b : a));
  const latest = monthly.at(-1);
  const food = pp.household.spending.find((r) => r.key === 'food');
  const poverty = pp.poverty.at(-1);

  const findings = [
    {
      figure: f.times(real.real / 100), tab: 'purchasing',
      text: t('con.f1', { real: f.num(real.real / 100, 2), nominal: f.num(real.nominal / 100, 2), prices: f.pct(real.prices - 100, 0) }),
    },
    {
      figure: f.signedPct((q.sofia / q.bulgaria - 1) * 100), tab: 'salaries',
      text: t('con.f2', { sofia: f.money(q.sofia), bg: f.money(q.bulgaria), pct: f.pct((q.sofia / q.bulgaria - 1) * 100) }),
    },
    {
      figure: f.pct(salaries.current.minimum / q.bulgaria * 100), tab: 'salaries',
      text: t('con.f3', { minPct: f.pct(salaries.current.minimum / q.bulgaria * 100), maxX: f.num(salaries.current.maxInsurable / q.bulgaria, 1) }),
    },
    {
      figure: `${f.pct(peak.bulgaria)} → ${f.pct(latest.bulgaria)}`, tab: 'inflation',
      text: t('con.f4', { peak: f.pct(peak.bulgaria), peakMonth: f.month(peak.month), low: f.pct(low.bulgaria), lowMonth: f.month(low.month), latest: f.pct(latest.bulgaria), month: f.month(latest.month) }),
    },
    {
      figure: f.pct(eu.at(-1).consumption, 0), tab: 'purchasing',
      text: t('con.f5', { aic: f.pct(eu.at(-1).consumption, 0), aic0: f.pct(eu[0].consumption, 0), pli: f.pct(eu.at(-1).priceLevel, 0) }),
    },
    {
      figure: `${f.signedPct(growth.at(-2).real)} → ${f.signedPct(growth.at(-1).real)}`, tab: 'purchasing',
      text: t('con.f6', { from: f.signedPct(growth.at(-2).real), to: f.signedPct(growth.at(-1).real) }),
    },
    {
      figure: f.pct(food.share), tab: 'purchasing',
      text: t('con.f7', { food: f.pct(food.share), poverty: f.pct(poverty.rate) }),
    },
  ];

  return (
    <article className="conclusion">
      <p className="conclusion__lead">{t('con.lead')}</p>

      <ol className="findings">
        {findings.map((x, i) => (
          <li key={i}>
            <span className="findings__figure">{x.figure}</span>
            <p>
              {x.text}{' '}
              <a href={`#${x.tab}`} onClick={(e) => { e.preventDefault(); onNavigate(x.tab); }}>{t('con.goto')} →</a>
            </p>
          </li>
        ))}
      </ol>

      <section className="origin">
        <h2>{t('con.data')}</h2>
        <p className="origin__lead">{rich(t('con.dataLead'))}</p>
        <div className="origin__grid">
          {ORIGINS.map((k) => (
            <div key={k} className="origin__card">
              <div className="origin__head">
                <h3>{t(`con.${k}.name`)}</h3>
                <span className="origin__format">{t(`con.${k}.format`)}</span>
              </div>
              <dl>
                <dt>{t('con.what')}</dt><dd>{t(`con.${k}.what`)}</dd>
                <dt>{t('con.how')}</dt><dd>{rich(t(`con.${k}.how`, { n: eurostatDatasets }))}</dd>
              </dl>
            </div>
          ))}
        </div>
        <div className="origin__flow">
          <ol className="steps">
            {STEPS.map((k) => <li key={k}><p><strong>{t(`con.${k}.name`)}</strong> {rich(t(`con.${k}`))}</p></li>)}
          </ol>
          <figure className="sample">
            <figcaption>{rich(t('con.sample'))}</figcaption>
            <pre>{JSON.stringify(q, null, 2)}</pre>
          </figure>
        </div>
      </section>

      <div className="conclusion__cols">
        <section>
          <h3>{t('con.method')}</h3>
          <ul className="plain-list">
            {['con.m1', 'con.m2', 'con.m3', 'con.m4'].map((k) => <li key={k}>{t(k)}</li>)}
          </ul>
        </section>
        <section>
          <h3>{t('con.sources')}</h3>
          <ul className="plain-list sources">
            {sources.list.map((s) => (
              <li key={s.url + s.title.en}>
                <span className="sources__pub">{s.publisher[lang]}</span>{' '}
                <a href={s.url} target="_blank" rel="noreferrer">{s.title[lang]}</a>
                {s.code && <span className="sources__code"> · {s.code}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
