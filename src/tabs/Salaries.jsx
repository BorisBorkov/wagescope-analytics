import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import data from '../data/salaries.json';
import { ChartTooltip } from '../components/ChartTooltip.jsx';
import { Donut } from '../components/Donut.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatRow } from '../components/Stats.jsx';
import {
  CategoryTick, activeDot, axisProps, categoryAxis, cursorProps, endLabel, gridProps, lineProps, pickLabel, useNarrow, yearOf, yearTicks,
} from '../components/chartKit.jsx';
import { useSettings } from '../settings.jsx';

// Bulgarian dates in the source notes use the local DD.MM.YYYY form.
const date = (iso, lang) => (lang === 'bg' ? iso.split('-').reverse().join('.') : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));

export default function Salaries() {
  const { t, f, colors, lang } = useSettings();
  const S = colors.series;
  const color = { bulgaria: S[0], sofia: S[1], minimum: S[2], maxInsurable: S[3], topSector: S[4] };
  const narrow = useNarrow();
  const sectorAxis = categoryAxis(narrow);
  const src = (...keys) => keys.map((k) => t(`src.${k}`)).join('; ');
  const label = (k) => t(`s.${k}`);

  const q = data.quarterly;
  const last = q.at(-1);
  const yearAgo = q.at(-5);
  const sofiaPremium = (last.sofia / last.bulgaria - 1) * 100;
  const topSector = data.sectors.rows[0];
  const sofiaSectors = data.sofiaSectors.at(-1);

  // --- 1. minimum / average / maximum by quarter
  const keys = ['topSector', 'maxInsurable', 'sofia', 'bulgaria', 'minimum'];
  const seriesAll = Object.fromEntries(keys.map((k) => [k, { label: label(k), color: color[k] }]));
  const qData = q.map((r) => ({ quarter: r.quarter, ...Object.fromEntries(keys.map((k) => [k, r[k] == null ? null : f.value(r[k])])) }));
  const qTicks = yearTicks(q.map((r) => r.quarter));

  // --- 2. ten years, annual averages
  const annual = data.annual.map((r) => ({ year: String(r.year), averageMonthly: f.value(r.averageMonthly), minimum: f.value(r.minimum) }));
  const annualSeries = { averageMonthly: { label: label('bulgaria'), color: color.bulgaria }, minimum: { label: label('minimum'), color: color.minimum } };

  // --- 3. Sofia premium over the national average
  const premium = q.filter((r) => r.sofia != null).map((r) => ({ quarter: r.quarter, premium: (r.sofia / r.bulgaria - 1) * 100 }));

  // --- 4. sectors
  const sectors = data.sectors.rows.map((r) => ({ ...r, label: r.name[lang], value: f.value(r.average) }));
  const sectorPeriod = f.quarter(data.sectors.period);

  // --- 5. employees by sector: five largest + the rest
  const byEmployees = [...data.sectors.rows].sort((a, b) => b.employees - a.employees);
  const donutRows = [
    ...byEmployees.slice(0, 5).map((r, i) => ({ key: r.code, label: r.name[lang], value: r.employees, color: S[i] })),
    { key: 'other', label: t('common.other'), value: byEmployees.slice(5).reduce((s, r) => s + r.employees, 0), color: colors.neutral },
  ];

  // --- 6. districts
  const districts = data.districts.rows.map((r) => ({ ...r, label: r.name[lang], value: f.value(r.average) }));
  const sofiaIdx = districts.findIndex((r) => r.sofiaCapital);

  // --- 7. minimum wage as a share of the average
  const minShare = q.map((r) => ({
    quarter: r.quarter,
    bulgaria: r.minimum / r.bulgaria * 100,
    sofia: r.sofia == null ? null : r.minimum / r.sofia * 100,
  }));
  const minShareSeries = { bulgaria: { label: t('sal.c7.bg'), color: color.bulgaria }, sofia: { label: t('sal.c7.sofia'), color: color.sofia } };

  // --- 8. distribution (Structure of Earnings Survey, October 2022)
  const minOct2022 = q.find((r) => r.quarter === '2022Q4').minimum;
  const dist = data.distribution2022;

  const moneyTick = (v) => f.num(v);
  const money = (v) => f.shown(v);

  return (
    <>
      <StatRow
        hero={{
          label: `${t('sal.hero')} · ${f.quarter(last.quarter)}`,
          value: f.money(last.bulgaria),
          delta: { text: `${f.signedPct((last.bulgaria / yearAgo.bulgaria - 1) * 100)} ${t('common.yoy')}`, tone: 'good' },
        }}
        stats={[
          { label: t('sal.sofia'), value: f.money(last.sofia), note: t('sal.sofiaNote', { pct: f.pct(sofiaPremium) }) },
          { label: t('sal.min'), value: f.exact(data.current.minimum), note: t('sal.minNote', { pct: f.pct(data.current.minimum / last.bulgaria * 100) }) },
          { label: t('sal.max'), value: f.money(data.current.maxInsurable), note: t('sal.maxNote', { date: date(data.current.maxInsurableChange, lang), before: f.exact(data.current.maxInsurableBefore) }) },
          { label: t('sal.top'), value: f.money(last.topSector), note: `${topSector.name[lang]} · ${f.quarter(last.quarter)}` },
        ]}
      />

      <div className="grid">
        <Panel
          size="wide"
          title={t('sal.c1.title')}
          note={t('sal.c1.note')}
          legend={keys.map((k) => ({ label: label(k), color: color[k] }))}
          source={src('nsi', 'nssi', 'cm')}
          table={{
            columns: [
              { key: 'quarter', label: t('common.quarter'), format: (v) => f.quarter(v) },
              ...keys.slice().reverse().map((k) => ({ key: k, label: label(k), format: (v) => (k === 'minimum' || k === 'maxInsurable' ? f.exact(v) : f.money(v)) })),
            ],
            rows: [...q].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={qData} margin={{ top: 12, right: 72, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="quarter" ticks={qTicks} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis tickFormatter={moneyTick} width={52} {...axisProps(colors)} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={seriesAll} format={(v) => money(v)} labelFormat={(l) => f.quarter(l)} />} />
              {keys.map((k) => (
                <Line key={k} dataKey={k} name={label(k)} type={k === 'minimum' || k === 'maxInsurable' ? 'stepAfter' : 'monotone'}
                  {...lineProps(color[k])} activeDot={activeDot(colors, color[k])}
                  label={endLabel(qData.length - 1, money(qData.at(-1)[k]), colors)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('sal.annual.title')}
          note={t('sal.annual.note')}
          legend={Object.values(annualSeries).map((s) => ({ ...s, shape: 'rect' }))}
          source={src('nsi', 'cm')}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              { key: 'averageMonthly', label: label('bulgaria'), format: (v) => f.money(v) },
              { key: 'minimum', label: label('minimum'), format: (v) => f.money(v) },
            ],
            rows: [...data.annual].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={annual} margin={{ top: 22, right: 8, bottom: 0, left: 4 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" tickFormatter={(y) => `’${y.slice(2)}`} {...axisProps(colors)} />
              <YAxis tickFormatter={moneyTick} width={52} {...axisProps(colors)} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<ChartTooltip series={annualSeries} format={(v) => money(v)} />} />
              {Object.entries(annualSeries).map(([k, s]) => (
                <Bar key={k} dataKey={k} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                  <LabelList dataKey={k} content={pickLabel(narrow ? [annual.length - 1] : [0, annual.length - 1], (v) => f.num(v), colors)} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('sal.c2.title')}
          note={t('sal.c2.note')}
          source={src('nsi')}
          table={{
            columns: [
              { key: 'quarter', label: t('common.quarter'), format: (v) => f.quarter(v) },
              { key: 'sofia', label: label('sofia'), format: (v) => f.money(v) },
              { key: 'bulgaria', label: label('bulgaria'), format: (v) => f.money(v) },
              { key: 'premium', label: t('sal.c2.series'), format: (v) => f.signedPct(v) },
            ],
            rows: q.filter((r) => r.sofia != null).map((r) => ({ ...r, premium: (r.sofia / r.bulgaria - 1) * 100 })).reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={premium} margin={{ top: 22, right: 8, bottom: 0, left: 4 }} barCategoryGap="18%">
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="quarter" ticks={qTicks} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis tickFormatter={(v) => `${v}%`} width={44} domain={[0, 'auto']} {...axisProps(colors)} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={{ premium: { label: t('sal.c2.series'), color: color.sofia } }} format={(v) => f.signedPct(v)} labelFormat={(l) => f.quarter(l)} />} />
              <Bar dataKey="premium" fill={color.sofia} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false}>
                <LabelList dataKey="premium" content={pickLabel([premium.length - 1], (v) => f.signedPct(v, 0), colors)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('sal.c3.title')}
          note={`${t('sal.c3.note', { period: sectorPeriod })} ${t('sal.sectorSofia', { priv: f.money(sofiaSectors.privateSector), pub: f.money(sofiaSectors.publicSector) })} (${f.quarter(sofiaSectors.quarter)}).`}
          source={src('nsi')}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'average', label: t('sal.c3.series'), format: (v) => f.money(v) },
              { key: 'employees', label: t('sal.c4.series'), format: (v) => f.num(v) },
            ],
            rows: sectors,
          }}
        >
          <ResponsiveContainer width="100%" height={sectors.length * 24 + 56}>
            <BarChart data={sectors} layout="vertical" margin={{ top: 20, right: 64, bottom: 0, left: 0 }} barCategoryGap={3}>
              <CartesianGrid {...gridProps(colors, 'vertical')} />
              <XAxis type="number" tickFormatter={moneyTick} {...axisProps(colors)} />
              <YAxis type="category" dataKey="label" width={sectorAxis.width} interval={0} {...axisProps(colors)} tick={<CategoryTick fill={colors.ink2} max={sectorAxis.max} />} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={{ value: { label: t('sal.c3.series'), color: color.bulgaria } }} format={(v) => money(v)} />} />
              <ReferenceLine x={f.value(data.sectors.total.average)} stroke={colors.ink2} strokeWidth={1}
                label={{ value: f.money(data.sectors.total.average), position: 'top', fill: colors.ink2, fontSize: 11 }} />
              <Bar dataKey="value" fill={color.bulgaria} radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="value" content={pickLabel([0, sectors.length - 1], (v) => money(v), colors, true)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('sal.c4.title')}
          note={t('sal.c4.note', { period: sectorPeriod })}
          source={src('nsi')}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'value', label: t('sal.c4.series'), format: (v) => f.num(v) },
              { key: 'share', label: t('common.share'), format: (v) => f.pct(v) },
            ],
            rows: donutRows.map((r) => ({ ...r, share: r.value / data.sectors.total.employees * 100 })),
          }}
        >
          <Donut rows={donutRows} format={(v) => f.num(v)} center={f.num(data.sectors.total.employees / 1e6, 2)} centerLabel={t('sal.c4.center')} />
        </Panel>

        <Panel
          size="tall"
          title={t('sal.c5.title')}
          note={t('sal.c5.note', { period: f.quarter(data.districts.period) })}
          source={src('nsi')}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'average', label: t('sal.c3.series'), format: (v) => f.money(v) },
            ],
            rows: districts,
          }}
        >
          <ResponsiveContainer width="100%" height={districts.length * 22 + 56}>
            <BarChart data={districts} layout="vertical" margin={{ top: 20, right: 64, bottom: 0, left: 0 }} barCategoryGap={3}>
              <CartesianGrid {...gridProps(colors, 'vertical')} />
              <XAxis type="number" tickFormatter={moneyTick} {...axisProps(colors)} />
              <YAxis type="category" dataKey="label" width={120} interval={0} {...axisProps(colors)}
                tick={<CategoryTick fill={colors.ink2} bold={(name) => name === districts[sofiaIdx].label} />} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={{ value: { label: t('sal.c3.series'), color: color.sofia } }} format={(v) => money(v)} />} />
              <ReferenceLine x={f.value(data.districts.national)} stroke={colors.ink2} strokeWidth={1}
                label={{ value: f.money(data.districts.national), position: 'top', fill: colors.ink2, fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false}>
                {districts.map((r) => <Cell key={r.id} fill={r.sofiaCapital ? color.sofia : colors.neutral} />)}
                <LabelList dataKey="value" content={pickLabel([sofiaIdx, districts.length - 1], (v) => money(v), colors, true)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('sal.c6.title')}
          note={t('sal.c6.note')}
          source={t('src.ses')}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'value', label: t('sal.c6.series'), format: (v) => f.money(v) },
            ],
            rows: [
              { label: t('sal.c6.min'), value: minOct2022 },
              { label: t('sal.c6.median'), value: dist.median },
              { label: t('sal.c6.mean'), value: dist.mean },
            ],
          }}
        >
          <NumberLine
            points={[
              { key: 'min', label: t('sal.c6.min'), value: minOct2022, color: color.minimum },
              { key: 'median', label: t('sal.c6.median'), value: dist.median, color: colors.ink2 },
              { key: 'mean', label: t('sal.c6.mean'), value: dist.mean, color: color.bulgaria },
            ]}
            format={(v) => f.money(v)}
          />
          <p className="panel__reading">{t('sal.c6.read', { pct: f.pct(dist.median / dist.mean * 100, 0) })}</p>
        </Panel>

        <Panel
          title={t('sal.c7.title')}
          note={t('sal.c7.note')}
          legend={Object.values(minShareSeries)}
          source={src('nsi', 'cm')}
          table={{
            columns: [
              { key: 'quarter', label: t('common.quarter'), format: (v) => f.quarter(v) },
              { key: 'bulgaria', label: minShareSeries.bulgaria.label, format: (v) => f.pct(v) },
              { key: 'sofia', label: minShareSeries.sofia.label, format: (v) => f.pct(v) },
            ],
            rows: [...minShare].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={minShare} margin={{ top: 12, right: 52, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="quarter" ticks={qTicks} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis tickFormatter={(v) => `${v}%`} width={44} domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} {...axisProps(colors)} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={minShareSeries} format={(v) => f.pct(v)} labelFormat={(l) => f.quarter(l)} />} />
              {Object.entries(minShareSeries).map(([k, s]) => (
                <Line key={k} dataKey={k} {...lineProps(s.color)} activeDot={activeDot(colors, s.color)}
                  label={endLabel(minShare.length - 1, f.pct(minShare.at(-1)[k], 0), colors)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}

/** A single value axis with labelled markers — for comparing a handful of levels at a glance. */
function NumberLine({ points, format }) {
  const { colors } = useSettings();
  const max = Math.max(...points.map((p) => p.value)) * 1.15;
  const pos = (v) => `${(v / max) * 100}%`;
  return (
    <div className="numberline">
      <div className="numberline__track" style={{ background: colors.grid }} />
      {points.map((p, i) => (
        <div key={p.key} className={`numberline__point numberline__point--${i % 2 ? 'below' : 'above'}`} style={{ left: pos(p.value) }}>
          <span className="numberline__dot" style={{ background: p.color, boxShadow: `0 0 0 2px ${colors.surface}` }} />
          <span className="numberline__label">
            <strong>{format(p.value)}</strong>
            <span>{p.label}</span>
          </span>
        </div>
      ))}
      <div className="numberline__zero">0</div>
    </div>
  );
}
