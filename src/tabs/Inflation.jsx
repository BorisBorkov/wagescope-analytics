import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import data from '../data/inflation.json';
import { ChartTooltip } from '../components/ChartTooltip.jsx';
import { Donut } from '../components/Donut.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatRow } from '../components/Stats.jsx';
import {
  CategoryTick, activeDot, axisProps, categoryAxis, cursorProps, gridProps, lineProps, pickLabel, roundedBar, useNarrow, yearOf, yearTicks,
} from '../components/chartKit.jsx';
import { useSettings } from '../settings.jsx';

const lastIndexOf = (rows, key) => rows.findLastIndex((r) => r[key] != null);

/** Line label at one chosen point (the peak, the latest value). */
const pointLabel = (indexes, format, colors) => function PointLabel({ x, y, index, value }) {
  if (!indexes.includes(index) || value == null) return null;
  return <text x={x + 6} y={y - 8} fill={colors.ink2} fontSize={12} fontWeight={600}>{format(value)}</text>;
};

export default function Inflation() {
  const { t, f, colors, lang } = useSettings();
  const S = colors.series;
  const BG = S[0];
  const catAxis = categoryAxis(useNarrow());
  const src = (code) => `${t('src.eurostat')} (${code})`;
  const EU = colors.neutral;

  const monthly = data.monthly;
  const latest = monthly.at(-1);
  const estimated = data.estimatedMonths.includes(latest.month);
  const euLatestIdx = lastIndexOf(monthly, 'eu');
  const idxLatest = lastIndexOf(monthly, 'bulgariaIndex');
  const peakIdx = monthly.reduce((best, r, i) => (r.bulgaria > monthly[best].bulgaria ? i : best), 0);
  const peak = monthly[peakIdx];
  const annual = data.annual;
  const lastYear = annual.at(-1);
  const sinceBg = monthly[idxLatest].bulgariaIndex - 100;
  const sinceEu = monthly[idxLatest].euIndex - 100;
  const drivers = ['food', 'energy', 'transport'];
  const fastest = drivers.map((k) => ({ k, v: monthly[lastIndexOf(monthly, k)][k] })).sort((a, b) => b.v - a.v)[0];
  const driverMonth = monthly[lastIndexOf(monthly, 'food')].month;

  const monthTicks = yearTicks(monthly.map((r) => r.month));
  const rateSeries = { bulgaria: { label: t('common.bulgaria'), color: BG }, eu: { label: t('common.eu'), color: EU } };

  // categories: rise since 2019, and the overall rise for reference
  const idx2019 = annual.find((r) => r.year === 2019).bulgariaIndex;
  const totalSince2019 = (lastYear.bulgariaIndex / idx2019 - 1) * 100;
  const categories = data.categories.map((c) => ({ ...c, label: c.name[lang] }));

  const driverData = monthly.filter((r) => r.month >= '2019-01');
  const driverSeries = {
    bulgaria: { label: t('s.total'), color: S[0] },
    food: { label: t('s.food'), color: S[1] },
    energy: { label: t('s.energy'), color: S[2] },
    transport: { label: t('s.transport'), color: S[3] },
  };

  const weights = data.weights.rows;
  const weightRows = [
    ...weights.slice(0, 5).map((r, i) => ({ key: r.code, label: r.name[lang], value: r.perMille / 10, color: S[i] })),
    { key: 'other', label: t('common.other'), value: weights.slice(5).reduce((s, r) => s + r.perMille, 0) / 10, color: colors.neutral },
  ];

  const pctTick = (v) => `${v}%`;

  return (
    <>
      <StatRow
        hero={{
          label: t('inf.hero'),
          value: f.pct(latest.bulgaria),
          delta: {
            text: `${f.month(latest.month)}${estimated ? ` · ${t('common.estimate')}` : ''}`,
            tone: 'neutral',
          },
          note: `${t('common.eu')}: ${f.pct(monthly[euLatestIdx].eu)} (${f.month(monthly[euLatestIdx].month)})`,
        }}
        stats={[
          { label: t('inf.peak'), value: f.pct(peak.bulgaria), note: f.month(peak.month) },
          { label: t('inf.avg', { year: lastYear.year }), value: f.pct(lastYear.bulgaria), note: t('inf.avgNote', { eu: f.pct(lastYear.eu) }) },
          { label: t('inf.since'), value: f.signedPct(sinceBg), note: t('inf.sinceNote', { month: f.month(monthly[idxLatest].month), eu: f.signedPct(sinceEu) }) },
          { label: t('inf.fastest'), value: f.pct(fastest.v), note: `${t(`s.${fastest.k}`)} · ${f.month(driverMonth)}` },
        ]}
      />

      <div className="grid">
        <Panel
          size="wide"
          title={t('inf.c1.title')}
          note={t('inf.c1.note')}
          legend={Object.values(rateSeries)}
          source={src('prc_hicp_minr')}
          table={{
            columns: [
              { key: 'month', label: t('common.month'), format: (v) => `${f.month(v)}${data.estimatedMonths.includes(v) ? ' *' : ''}` },
              { key: 'bulgaria', label: t('common.bulgaria'), format: (v) => f.pct(v) },
              { key: 'eu', label: t('common.eu'), format: (v) => f.pct(v) },
            ],
            rows: [...monthly].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={monthly} margin={{ top: 20, right: 48, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="month" ticks={monthTicks} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis tickFormatter={pctTick} width={44} {...axisProps(colors)} />
              <ReferenceLine y={0} stroke={colors.axis} />
              <ReferenceLine y={2} stroke={colors.ink2} strokeWidth={1}
                label={{ value: t('inf.target'), position: 'insideTopLeft', fill: colors.ink2, fontSize: 11 }} />
              <ReferenceLine x="2026-01" stroke={colors.ink2} strokeWidth={1}
                label={{ value: t('inf.euro'), position: 'insideTopRight', fill: colors.ink2, fontSize: 11 }} />
              <Tooltip cursor={cursorProps(colors)}
                content={<ChartTooltip series={rateSeries} format={(v) => f.pct(v)}
                  labelFormat={(l) => `${f.month(l)}${data.estimatedMonths.includes(l) ? ` · ${t('common.estimate')}` : ''}`} />} />
              <Line dataKey="eu" {...lineProps(EU)} activeDot={activeDot(colors, EU)}
                label={pointLabel([euLatestIdx], (v) => f.pct(v), colors)} />
              <Line dataKey="bulgaria" {...lineProps(BG)} activeDot={activeDot(colors, BG)}
                label={pointLabel([peakIdx, monthly.length - 1], (v) => f.pct(v), colors)} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('inf.c2.title')}
          note={t('inf.c2.note')}
          legend={Object.values(rateSeries).map((s) => ({ ...s, shape: 'rect' }))}
          source={src('prc_hicp_ainr')}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              { key: 'bulgaria', label: t('common.bulgaria'), format: (v) => f.pct(v) },
              { key: 'eu', label: t('common.eu'), format: (v) => f.pct(v) },
            ],
            rows: [...annual].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={annual} margin={{ top: 22, right: 8, bottom: 0, left: 4 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" tickFormatter={(y) => `’${String(y).slice(2)}`} {...axisProps(colors)} />
              <YAxis tickFormatter={pctTick} width={40} {...axisProps(colors)} />
              <ReferenceLine y={0} stroke={colors.axis} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<ChartTooltip series={rateSeries} format={(v) => f.pct(v)} />} />
              <Bar dataKey="bulgaria" fill={BG} shape={roundedBar()} maxBarSize={18} isAnimationActive={false}>
                <LabelList dataKey="bulgaria" content={pickLabel([annual.findIndex((r) => r.year === 2022), annual.length - 1], (v) => f.pct(v), colors)} />
              </Bar>
              <Bar dataKey="eu" fill={EU} shape={roundedBar()} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('inf.c3.title')}
          note={t('inf.c3.note')}
          legend={Object.values(rateSeries)}
          source={src('prc_hicp_minr')}
          table={{
            columns: [
              { key: 'month', label: t('common.month'), format: (v) => f.month(v) },
              { key: 'bulgariaIndex', label: t('common.bulgaria'), format: (v) => f.num(v, 1) },
              { key: 'euIndex', label: t('common.eu'), format: (v) => f.num(v, 1) },
            ],
            rows: monthly.filter((r) => r.bulgariaIndex != null).reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly} margin={{ top: 12, right: 48, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="month" ticks={yearTicks(monthly.map((r) => r.month), 2)} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis width={40} domain={[90, 'auto']} {...axisProps(colors)} />
              <ReferenceLine y={100} stroke={colors.axis} />
              <Tooltip cursor={cursorProps(colors)}
                content={<ChartTooltip series={{ bulgariaIndex: rateSeries.bulgaria, euIndex: rateSeries.eu }} format={(v) => f.num(v, 1)} labelFormat={(l) => f.month(l)} />} />
              <Line dataKey="euIndex" {...lineProps(EU)} activeDot={activeDot(colors, EU)} label={pointLabel([idxLatest], (v) => f.num(v, 0), colors)} />
              <Line dataKey="bulgariaIndex" {...lineProps(BG)} activeDot={activeDot(colors, BG)} label={pointLabel([idxLatest], (v) => f.num(v, 0), colors)} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('inf.c4.title')}
          note={t('inf.c4.note', { year: data.categoriesLatestYear })}
          source={src('prc_hicp_ainr')}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'since2019', label: `2019→${data.categoriesLatestYear}`, format: (v) => f.signedPct(v) },
              { key: 'rate2022', label: '2022', format: (v) => f.signedPct(v) },
              { key: 'rateLatest', label: String(data.categoriesLatestYear), format: (v) => f.signedPct(v) },
            ],
            rows: categories,
          }}
        >
          <ResponsiveContainer width="100%" height={categories.length * 26 + 40}>
            <BarChart data={categories} layout="vertical" margin={{ top: 20, right: 56, bottom: 0, left: 0 }} barCategoryGap={4}>
              <CartesianGrid {...gridProps(colors, 'vertical')} />
              <XAxis type="number" tickFormatter={pctTick} {...axisProps(colors)} />
              <YAxis type="category" dataKey="label" width={catAxis.width} interval={0} {...axisProps(colors)} tick={<CategoryTick fill={colors.ink2} max={catAxis.max} />} />
              <ReferenceLine x={0} stroke={colors.axis} />
              <ReferenceLine x={totalSince2019} stroke={colors.ink2} strokeWidth={1}
                label={{ value: `${t('s.total')} ${f.signedPct(totalSince2019, 0)}`, position: 'top', fill: colors.ink2, fontSize: 11 }} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={{ since2019: { label: t('inf.c4.series'), color: BG } }} format={(v) => f.signedPct(v)} />} />
              <Bar dataKey="since2019" fill={BG} shape={roundedBar('horizontal')} maxBarSize={16} isAnimationActive={false}>
                <LabelList dataKey="since2019" content={pickLabel([0], (v) => f.signedPct(v, 0), colors, true)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('inf.c6.title')}
          note={t('inf.c6.note', { year: data.weights.year })}
          source={src('prc_hicp_iw')}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'value', label: t('inf.c6.series'), format: (v) => f.pct(v) },
            ],
            rows: weights.map((r) => ({ label: r.name[lang], value: r.perMille / 10 })),
          }}
        >
          <Donut rows={weightRows} center={f.pct(weightRows[0].value)} centerLabel={weightRows[0].label} />
        </Panel>

        <Panel
          size="wide"
          title={t('inf.c5.title')}
          note={t('inf.c5.note')}
          legend={Object.values(driverSeries)}
          source={src('prc_hicp_minr')}
          table={{
            columns: [
              { key: 'month', label: t('common.month'), format: (v) => f.month(v) },
              ...Object.entries(driverSeries).map(([k, s]) => ({ key: k, label: s.label, format: (v) => f.pct(v) })),
            ],
            rows: [...driverData].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={driverData} margin={{ top: 12, right: 16, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="month" ticks={yearTicks(driverData.map((r) => r.month))} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis tickFormatter={pctTick} width={44} {...axisProps(colors)} />
              <ReferenceLine y={0} stroke={colors.axis} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={driverSeries} format={(v) => f.pct(v)} labelFormat={(l) => f.month(l)} />} />
              {Object.entries(driverSeries).reverse().map(([k, s]) => (
                <Line key={k} dataKey={k} {...lineProps(s.color)} strokeWidth={k === 'bulgaria' ? 2.5 : 2} activeDot={activeDot(colors, s.color)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}
