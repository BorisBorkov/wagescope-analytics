import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import data from '../data/purchasing-power.json';
import { ChartTooltip } from '../components/ChartTooltip.jsx';
import { Donut } from '../components/Donut.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatRow } from '../components/Stats.jsx';
import {
  CategoryTick, activeDot, axisProps, cursorProps, endLabel, gridProps, lineProps, pickLabel, roundedBar, yearOf, yearTicks,
} from '../components/chartKit.jsx';
import { useSettings } from '../settings.jsx';


export default function PurchasingPower() {
  const { t, f, colors, lang } = useSettings();
  const S = colors.series;
  const color = { bulgaria: S[0], sofia: S[1], minimum: S[2] };
  const NSI = t('src.nsi');
  const EUROSTAT = t('src.eurostat');

  const real = data.realWages;
  const lastReal = real.at(-1);
  const growth = data.realGrowthQuarterly;
  const lastGrowth = growth.at(-1);
  const eu = data.euComparison.bulgaria;
  const lastEu = eu.at(-1);
  const poverty = data.poverty;
  const lastPoverty = poverty.at(-1);

  // 1. wages vs prices, 2015 = 100
  const realSeries = {
    nominal: { label: t('s.nominal'), color: S[0], faded: true },
    prices: { label: t('s.prices'), color: colors.neutral },
    real: { label: t('s.real'), color: S[0] },
    minimumReal: { label: t('s.minReal'), color: color.minimum },
  };
  const realData = real.map((r) => ({ ...r, year: String(r.year) }));

  // 2. real growth by quarter, Bulgaria and Sofia
  const growthData = growth.filter((r) => r.quarter >= '2021Q1');
  const growthSeries = { real: { label: t('common.bulgaria'), color: color.bulgaria }, sofiaReal: { label: t('common.sofia'), color: color.sofia } };

  // 3. EU minimum wages: euro vs PPS
  const mw = [...data.minimumWageEU.rows].reverse().map((r) => ({ ...r, label: r.name[lang] }));
  const mwSeries = { eur: { label: t('s.eur'), color: S[0] }, pps: { label: t('s.pps'), color: S[1] } };
  const bgName = mw.find((r) => r.geo === 'BG').label;
  const ppsRank = [...mw].sort((a, b) => a.pps - b.pps).findIndex((r) => r.geo === 'BG') + 1;

  // 4. catching up with the EU
  const euSeries = { consumption: { label: t('s.consumption'), color: S[0] }, priceLevel: { label: t('s.priceLevel'), color: S[1] } };
  const euData = eu.map((r) => ({ ...r, year: String(r.year) }));

  // 5. poverty line vs wages (money in the display currency)
  const povSeries = {
    average: { label: t('s.average'), color: color.bulgaria },
    minimum: { label: t('s.minimum'), color: color.minimum },
    line: { label: t('s.poverty'), color: colors.ink2 },
  };
  const povData = poverty.map((r) => ({ year: String(r.year), average: f.value(r.average), minimum: f.value(r.minimum), line: f.value(r.line) }));

  // 6. household spending
  const spending = data.household.spending.map((r, i) => ({
    key: r.key, label: r.name[lang], value: r.perYear, color: r.key === 'other' ? colors.neutral : S[i],
  }));

  // 7. household real income
  const income = data.household.realIncomeIndex.map((r) => ({ ...r, year: String(r.year) }));

  // 8. Sofia vs Bulgaria GDP per person
  const gdpSeries = { sofia: { label: t('common.sofia'), color: color.sofia }, bulgaria: { label: t('common.bulgaria'), color: color.bulgaria } };
  const gdp = data.regionalGdp.map((r) => ({ ...r, year: String(r.year) }));

  const yearTick = (y) => `’${String(y).slice(2)}`;
  const pctTick = (v) => `${v}%`;

  return (
    <>
      <StatRow
        hero={{
          label: t('pp.hero', { year: lastReal.year }),
          value: f.times(lastReal.real / 100),
          delta: { text: t('pp.heroNote', { nominal: f.num(lastReal.nominal / 100, 2), prices: f.num(lastReal.prices / 100, 2) }), tone: 'good' },
        }}
        stats={[
          {
            label: t('pp.real', { quarter: f.quarter(lastGrowth.quarter) }),
            value: f.signedPct(lastGrowth.real),
            note: t('pp.realNote', { nominal: f.signedPct(lastGrowth.nominal), prices: f.signedPct(lastGrowth.inflation) }),
          },
          { label: t('pp.consumption'), value: f.pct(lastEu.consumption, 0), note: t('pp.consumptionNote', { year: lastEu.year }) },
          { label: t('pp.priceLevel'), value: f.pct(lastEu.priceLevel, 0), note: t('pp.consumptionNote', { year: lastEu.year }) },
          { label: t('pp.poverty'), value: f.money(lastPoverty.line), note: t('pp.povertyNote', { year: lastPoverty.year, rate: f.pct(lastPoverty.rate) }) },
        ]}
      />

      <div className="grid">
        <Panel
          size="wide"
          title={t('pp.c1.title')}
          note={t('pp.c1.note')}
          legend={Object.values(realSeries)}
          source={`${NSI}; ${EUROSTAT} (prc_hicp_ainr)`}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              ...Object.entries(realSeries).map(([k, s]) => ({ key: k, label: s.label, format: (v) => f.num(v, 1) })),
            ],
            rows: [...real].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={realData} margin={{ top: 12, right: 48, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" {...axisProps(colors)} />
              <YAxis width={44} domain={[80, 'auto']} {...axisProps(colors)} />
              <ReferenceLine y={100} stroke={colors.axis} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={realSeries} format={(v) => f.num(v, 1)} />} />
              {Object.entries(realSeries).map(([k, s]) => (
                <Line key={k} dataKey={k} {...lineProps(s.color)} strokeWidth={k === 'real' ? 2.5 : 2} strokeOpacity={s.faded ? 0.45 : 1}
                  activeDot={activeDot(colors, s.color)}
                  // the two real series end 4 points apart; only the average carries an end label
                  label={k === 'minimumReal' ? false : endLabel(realData.length - 1, f.num(realData.at(-1)[k], 0), colors)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('pp.c2.title')}
          note={t('pp.c2.note')}
          legend={Object.values(growthSeries).map((s) => ({ ...s, shape: 'rect' }))}
          source={`${NSI}; ${EUROSTAT} (prc_hicp_minr)`}
          table={{
            columns: [
              { key: 'quarter', label: t('common.quarter'), format: (v) => f.quarter(v) },
              { key: 'nominal', label: t('pp.c2.nominal'), format: (v) => f.signedPct(v) },
              { key: 'inflation', label: t('pp.c2.inflation'), format: (v) => f.signedPct(v) },
              { key: 'real', label: t('common.bulgaria'), format: (v) => f.signedPct(v) },
              { key: 'sofiaReal', label: t('common.sofia'), format: (v) => f.signedPct(v) },
            ],
            rows: [...growth].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={growthData} margin={{ top: 22, right: 8, bottom: 0, left: 4 }} barGap={1} barCategoryGap="18%">
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="quarter" ticks={yearTicks(growthData.map((r) => r.quarter))} tickFormatter={yearOf} {...axisProps(colors)} />
              <YAxis tickFormatter={pctTick} width={40} {...axisProps(colors)} />
              <ReferenceLine y={0} stroke={colors.axis} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={growthSeries} format={(v) => f.signedPct(v)} labelFormat={(l) => f.quarter(l)}
                  extra={(row) => t('pp.realNote', { nominal: f.signedPct(row.nominal), prices: f.signedPct(row.inflation) })} />} />
              <Bar dataKey="real" fill={color.bulgaria} shape={roundedBar()} maxBarSize={10} isAnimationActive={false} />
              <Bar dataKey="sofiaReal" fill={color.sofia} shape={roundedBar()} maxBarSize={10} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('pp.c5.title')}
          note={t('pp.c5.note')}
          legend={Object.values(povSeries)}
          source={`${NSI}; ${EUROSTAT} (ilc_li01)`}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              { key: 'average', label: t('s.average'), format: (v) => f.money(v) },
              { key: 'minimum', label: t('s.minimum'), format: (v) => f.money(v) },
              { key: 'line', label: t('s.poverty'), format: (v) => f.money(v) },
              { key: 'rate', label: t('pp.c5.below'), format: (v) => f.pct(v) },
            ],
            rows: [...poverty].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={povData} margin={{ top: 12, right: 64, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" tickFormatter={yearTick} {...axisProps(colors)} />
              <YAxis tickFormatter={(v) => f.num(v)} width={52} {...axisProps(colors)} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={povSeries} format={(v) => f.shown(v)} />} />
              {Object.entries(povSeries).map(([k, s]) => (
                <Line key={k} dataKey={k} {...lineProps(s.color)} strokeWidth={k === 'line' ? 1.5 : 2} activeDot={activeDot(colors, s.color)}
                  label={endLabel(povData.length - 1, f.shown(povData.at(-1)[k]), colors)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          size="tall"
          title={t('pp.c3.title')}
          note={t('pp.c3.note')}
          legend={Object.values(mwSeries).map((s) => ({ ...s, shape: 'rect' }))}
          source={`${EUROSTAT} (earn_mw_cur)`}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'eur', label: t('s.eur'), format: (v) => `${f.num(v)} €` },
              { key: 'pps', label: t('s.pps'), format: (v) => `${f.num(v)} PPS` },
            ],
            rows: mw,
          }}
        >
          <p className="panel__reading">{t('pp.c3.reading', { country: bgName, rank: f.ordinal(ppsRank) })}</p>
          <ResponsiveContainer width="100%" height={mw.length * 30 + 40}>
            <BarChart data={mw} layout="vertical" margin={{ top: 4, right: 52, bottom: 0, left: 0 }} barGap={2} barCategoryGap={6}>
              <CartesianGrid {...gridProps(colors, 'vertical')} />
              <XAxis type="number" {...axisProps(colors)} />
              <YAxis type="category" dataKey="label" width={104} interval={0} {...axisProps(colors)}
                tick={<CategoryTick fill={colors.ink2} bold={(name) => name === bgName} />} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={mwSeries} format={(v, k) => (k === 'eur' ? `${f.num(v)} €` : `${f.num(v)} PPS`)} />} />
              {Object.entries(mwSeries).map(([k, s]) => (
                <Bar key={k} dataKey={k} fill={s.color} radius={[0, 4, 4, 0]} maxBarSize={9} isAnimationActive={false}>
                  <LabelList dataKey={k} content={pickLabel([mw.findIndex((r) => r.geo === 'BG')], (v) => f.num(v), colors, true)} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('pp.c4.title')}
          note={t('pp.c4.note')}
          legend={Object.values(euSeries)}
          source={`${EUROSTAT} (prc_ppp_ind_1)`}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              { key: 'consumption', label: t('s.consumption'), format: (v) => f.num(v) },
              { key: 'priceLevel', label: t('s.priceLevel'), format: (v) => f.num(v, 1) },
              { key: 'gdp', label: t('s.gdp'), format: (v) => f.num(v) },
            ],
            rows: [...eu].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={euData} margin={{ top: 12, right: 40, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" tickFormatter={yearTick} {...axisProps(colors)} />
              <YAxis tickFormatter={pctTick} width={44} domain={[40, 110]} ticks={[40, 55, 70, 85, 100]} {...axisProps(colors)} />
              <ReferenceLine y={100} stroke={colors.ink2} strokeWidth={1}
                label={{ value: `${t('common.eu')} = 100`, position: 'insideBottomLeft', fill: colors.ink2, fontSize: 11 }} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={euSeries} format={(v) => f.pct(v, 0)} />} />
              {Object.entries(euSeries).map(([k, s]) => (
                <Line key={k} dataKey={k} {...lineProps(s.color)} activeDot={activeDot(colors, s.color)}
                  label={endLabel(euData.length - 1, f.pct(euData.at(-1)[k], 0), colors)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('pp.c7.title')}
          note={t('pp.c7.note')}
          legend={Object.values(gdpSeries)}
          source={`${EUROSTAT} (nama_10r_3gdp)`}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              { key: 'sofia', label: t('common.sofia'), format: (v) => f.pct(v, 0) },
              { key: 'bulgaria', label: t('common.bulgaria'), format: (v) => f.pct(v, 0) },
            ],
            rows: [...data.regionalGdp].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={gdp} margin={{ top: 12, right: 48, bottom: 0, left: 4 }}>
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" tickFormatter={yearTick} {...axisProps(colors)} />
              <YAxis tickFormatter={pctTick} width={48} domain={[0, 160]} {...axisProps(colors)} />
              <ReferenceLine y={100} stroke={colors.ink2} strokeWidth={1}
                label={{ value: `${t('common.eu')} = 100`, position: 'insideBottomLeft', fill: colors.ink2, fontSize: 11 }} />
              <Tooltip cursor={cursorProps(colors)} content={<ChartTooltip series={gdpSeries} format={(v) => f.pct(v, 0)} />} />
              {Object.entries(gdpSeries).map(([k, s]) => (
                <Line key={k} dataKey={k} {...lineProps(s.color)} activeDot={activeDot(colors, s.color)}
                  label={endLabel(gdp.length - 1, f.pct(gdp.at(-1)[k], 0), colors)} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('pp.c6.title')}
          note={t('pp.c6.note', { year: data.household.year })}
          source={`${NSI} — ${t('pp.hbs')}`}
          table={{
            columns: [
              { key: 'label', label: '', align: 'left' },
              { key: 'value', label: t('pp.c6.series'), format: (v) => f.money(v) },
              { key: 'share', label: t('common.share'), format: (v) => f.pct(v) },
            ],
            rows: data.household.spending.map((r) => ({ label: r.name[lang], value: r.perYear, share: r.share })),
          }}
        >
          <Donut rows={spending} format={(v) => f.money(v)} center={f.pct(data.household.spending[0].share)} centerLabel={spending[0].label} />
        </Panel>

        <Panel
          title={t('pp.c8.title')}
          note={t('pp.c8.note')}
          source={`${NSI} — ${t('pp.hbs')}`}
          table={{
            columns: [
              { key: 'year', label: t('common.year') },
              { key: 'index', label: t('s.index'), format: (v) => f.num(v, 1) },
            ],
            rows: [...income].reverse(),
          }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={income} margin={{ top: 22, right: 8, bottom: 0, left: 4 }} barCategoryGap="24%">
              <CartesianGrid {...gridProps(colors)} />
              <XAxis dataKey="year" tickFormatter={yearTick} {...axisProps(colors)} />
              <YAxis width={40} domain={[0, 200]} {...axisProps(colors)} />
              <ReferenceLine y={100} stroke={colors.axis} />
              <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }}
                content={<ChartTooltip series={{ index: { label: t('s.index'), color: S[0] } }} format={(v) => f.num(v, 1)} />} />
              <Bar dataKey="index" fill={S[0]} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                <LabelList dataKey="index" content={pickLabel([income.length - 1], (v) => f.num(v, 0), colors)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}

