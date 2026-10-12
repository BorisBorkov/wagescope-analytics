// Normalises the raw inputs in data/raw/ into the JSON files the app reads (src/data/).
// Run: npm run data:build   (after npm run data:fetch for fresh Eurostat data)
//
// Conventions in the output:
//   - every money value is EUR per month unless the field name says otherwise;
//     BGN amounts are converted at the fixed euro conversion rate 1.95583
//   - quarters are written "2026Q2", months "2026-09"
//   - labels that appear in the UI are stored as { bg, en }
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as XLSX from 'xlsx';

const BGN_PER_EUR = 1.95583;
const root = new URL('../', import.meta.url);
const raw = (p) => new URL(`data/raw/${p}`, root);
const readJson = (p) => JSON.parse(readFileSync(raw(p), 'utf8'));
const toEur = (bgn) => bgn / BGN_PER_EUR;
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const warnings = [];
const check = (ok, msg) => { if (!ok) warnings.push(msg); };

// ---------------------------------------------------------------- helpers

/** Flattens a Eurostat JSON-stat 2.0 dataset into rows of { dim: code, ..., value }. */
function jsonStat(file) {
  const ds = readJson(`eurostat/${file}.json`);
  const codes = ds.id.map((id) => {
    const index = ds.dimension[id].category.index;
    return Object.keys(index).sort((a, b) => index[a] - index[b]);
  });
  return Object.entries(ds.value).map(([flat, value]) => {
    let rest = Number(flat);
    const row = { value, status: ds.status?.[flat] };
    for (let d = ds.id.length - 1; d >= 0; d--) {
      row[ds.id[d]] = codes[d][rest % ds.size[d]];
      rest = Math.floor(rest / ds.size[d]);
    }
    return row;
  });
}

const pick = (rows, filter) => rows.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
const series = (rows, filter) => Object.fromEntries(pick(rows, filter).map((r) => [r.time, r.value]));
const flagged = (rows, filter, flag) => pick(rows, filter).filter((r) => r.status === flag).map((r) => r.time);

/** Reads one sheet of an NSI spreadsheet as an array of rows. */
function sheet(file, name) {
  const wb = XLSX.read(readFileSync(raw(`nsi/${file}`)));
  const ws = wb.Sheets[name] ?? wb.Sheets[wb.SheetNames.find((n) => n.trim() === name.trim())];
  if (!ws) throw new Error(`${file}: no sheet "${name}"`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null });
}
const label = (cell) => String(cell ?? '').replace(/^\s*-\s*/, '').trim();

/** Value in force on a date for a list of { from, bgn | eur } periods, in EUR. */
function inForce(periods, date) {
  const p = periods.filter((x) => x.from <= date).at(-1);
  return p.eur ?? toEur(p.bgn);
}
const quarterStart = (q) => `${q.slice(0, 4)}-${String((+q.at(-1) - 1) * 3 + 1).padStart(2, '0')}-01`;
const monthsOf = (q) => [0, 1, 2].map((i) => `${q.slice(0, 4)}-${String((+q.at(-1) - 1) * 3 + 1 + i).padStart(2, '0')}`);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function quarters(from, to) {
  const out = [];
  for (let y = +from.slice(0, 4), q = +from.at(-1); `${y}Q${q}` <= to; q === 4 ? (y++, q = 1) : q++) out.push(`${y}Q${q}`);
  return out;
}

// ---------------------------------------------------------------- labels

const SECTORS = {
  A: { bg: 'Селско, горско и рибно стопанство', en: 'Agriculture, forestry and fishing' },
  B: { bg: 'Добивна промишленост', en: 'Mining and quarrying' },
  C: { bg: 'Преработваща промишленост', en: 'Manufacturing' },
  D: { bg: 'Енергетика', en: 'Electricity, gas and steam' },
  E: { bg: 'Води и отпадъци', en: 'Water supply and waste' },
  F: { bg: 'Строителство', en: 'Construction' },
  G: { bg: 'Търговия', en: 'Wholesale and retail trade' },
  H: { bg: 'Транспорт и складиране', en: 'Transport and storage' },
  I: { bg: 'Хотели и ресторанти', en: 'Accommodation and food' },
  J: { bg: 'ИКТ и далекосъобщения', en: 'Information and communication' },
  K: { bg: 'Финанси и застраховане', en: 'Finance and insurance' },
  L: { bg: 'Недвижими имоти', en: 'Real estate' },
  M: { bg: 'Професионални и научни дейности', en: 'Professional and scientific' },
  N: { bg: 'Административни дейности', en: 'Administrative and support' },
  O: { bg: 'Държавно управление', en: 'Public administration' },
  P: { bg: 'Образование', en: 'Education' },
  Q: { bg: 'Здравеопазване и социална работа', en: 'Health and social work' },
  R: { bg: 'Култура, спорт и развлечения', en: 'Arts and recreation' },
  S: { bg: 'Други дейности', en: 'Other services' },
};

const DISTRICTS = {
  'Vidin': 'Видин', 'Vratsa': 'Враца', 'Lovech': 'Ловеч', 'Montana': 'Монтана', 'Pleven': 'Плевен',
  'Veliko Tarnovo': 'Велико Търново', 'Gabrovo': 'Габрово', 'Razgrad': 'Разград', 'Ruse': 'Русе', 'Silistra': 'Силистра',
  'Varna': 'Варна', 'Dobrich': 'Добрич', 'Targovishte': 'Търговище', 'Shumen': 'Шумен', 'Burgas': 'Бургас',
  'Sliven': 'Сливен', 'Stara Zagora': 'Стара Загора', 'Yambol': 'Ямбол', 'Blagoevgrad': 'Благоевград',
  'Kyustendil': 'Кюстендил', 'Pernik': 'Перник', 'Sofia': 'София (област)', 'Sofia cap.': 'София (столица)',
  'Kardzhali': 'Кърджали', 'Pazardzhik': 'Пазарджик', 'Plovdiv': 'Пловдив', 'Smolyan': 'Смолян', 'Haskovo': 'Хасково',
};

const COICOP = {
  CP01: { bg: 'Храни и безалкохолни напитки', en: 'Food and non-alcoholic beverages' },
  CP02: { bg: 'Алкохол и тютюн', en: 'Alcohol and tobacco' },
  CP03: { bg: 'Облекло и обувки', en: 'Clothing and footwear' },
  CP04: { bg: 'Жилище, вода, енергия и горива', en: 'Housing, water, energy and fuels' },
  CP05: { bg: 'Обзавеждане и поддръжка на дома', en: 'Furnishings and household upkeep' },
  CP06: { bg: 'Здравеопазване', en: 'Health' },
  CP07: { bg: 'Транспорт', en: 'Transport' },
  CP08: { bg: 'Информация и комуникации', en: 'Information and communication' },
  CP09: { bg: 'Отдих, спорт и култура', en: 'Recreation, sport and culture' },
  CP10: { bg: 'Образование', en: 'Education' },
  CP11: { bg: 'Ресторанти и хотели', en: 'Restaurants and accommodation' },
  CP12: { bg: 'Застраховане и финансови услуги', en: 'Insurance and financial services' },
  CP13: { bg: 'Лична грижа и други', en: 'Personal care and miscellaneous' },
};

const COUNTRIES = {
  BE: ['Белгия', 'Belgium'], BG: ['България', 'Bulgaria'], CZ: ['Чехия', 'Czechia'], DK: ['Дания', 'Denmark'],
  DE: ['Германия', 'Germany'], EE: ['Естония', 'Estonia'], IE: ['Ирландия', 'Ireland'], EL: ['Гърция', 'Greece'],
  ES: ['Испания', 'Spain'], FR: ['Франция', 'France'], HR: ['Хърватия', 'Croatia'], IT: ['Италия', 'Italy'],
  CY: ['Кипър', 'Cyprus'], LV: ['Латвия', 'Latvia'], LT: ['Литва', 'Lithuania'], LU: ['Люксембург', 'Luxembourg'],
  HU: ['Унгария', 'Hungary'], MT: ['Малта', 'Malta'], NL: ['Нидерландия', 'Netherlands'], AT: ['Австрия', 'Austria'],
  PL: ['Полша', 'Poland'], PT: ['Португалия', 'Portugal'], RO: ['Румъния', 'Romania'], SI: ['Словения', 'Slovenia'],
  SK: ['Словакия', 'Slovakia'], FI: ['Финландия', 'Finland'], SE: ['Швеция', 'Sweden'], EU27_2020: ['ЕС-27', 'EU-27'],
};
const country = (geo) => ({ bg: COUNTRIES[geo][0], en: COUNTRIES[geo][1] });

// ---------------------------------------------------------------- inputs

const official = readJson('official.json');
const releases = readJson('nsi/quarterly-releases.json').releases;
const minWage = official.minimumWage.periods;
const maxIncome = official.maxInsurableIncome.periods;

// Minimum wage: compare the decree values with Eurostat (which rounds to whole euro).
const mwEurostat = jsonStat('min-wage-bg');
for (const r of pick(mwEurostat, { currency: 'EUR' })) {
  const date = `${r.time.slice(0, 4)}-${r.time.endsWith('S1') ? '01' : '07'}-01`;
  check(Math.abs(inForce(minWage, date) - r.value) <= 0.6, `min wage ${r.time}: decree ${r2(inForce(minWage, date))} vs Eurostat ${r.value}`);
}

// NSI regional time series: average gross monthly wage by district, quarterly, EUR.
const regional = sheet('Labour_1.1.2.2_EUR_EN.xlsx', '2019-2025');
const qHeader = regional.findIndex((row) => String(row[1] ?? '').startsWith('Quarters 2019'));
const districtQuarterly = {};
for (const row of regional.slice(qHeader + 2)) {
  if (!String(row[0] ?? '').trim().startsWith('-')) continue; // statistical regions have no dash
  const name = label(row[0]);
  const values = {};
  // Five columns per year: I, II, III, IV, IV including annual bonuses (skipped).
  for (let y = 2019; y <= 2025; y++) {
    for (let q = 1; q <= 4; q++) {
      const v = row[1 + (y - 2019) * 5 + (q - 1)];
      if (typeof v === 'number') values[`${y}Q${q}`] = v;
    }
  }
  districtQuarterly[name] = values;
}
check(Object.keys(districtQuarterly).length === 28, `expected 28 districts, got ${Object.keys(districtQuarterly).length}`);
const sofiaQuarterly = { ...districtQuarterly['Sofia cap.'] };
for (const row of official.sofiaLatestQuarters.rows) sofiaQuarterly[row.quarter] = row.eur ?? toEur(row.bgn);

// National quarterly average from the NSI press releases.
const national = Object.fromEntries(releases.map((r) => {
  const conv = r.currency === 'BGN' ? toEur : (x) => x;
  check(Math.abs(mean(r.months) - r.quarterAverage) <= 1, `${r.quarter}: months mean ${r2(mean(r.months))} vs headline ${r.quarterAverage}`);
  return [r.quarter, { avg: conv(r.quarterAverage), months: r.months.map(conv), ict: conv(r.ictAverage) }];
}));

// NSI annual average wages (annual total, BGN or EUR) → average per month in EUR.
// The first column also holds sub-titles ("Total"), so search below the year header row.
const rowValues = (rows, name, from = 0) => rows.slice(from).find((row) => label(row[0]) === name)?.slice(1);
const yearHeader = (rows, first) => rows.findIndex((row) => row[1] === first);
const annualWage = {};
{
  const eur = sheet('Labour_2.2.1_EUR_EN.xlsx', '2020 -2024NaceRev2');
  const eurHeader = yearHeader(eur, 2020);
  const years = eur[eurHeader].slice(1);
  rowValues(eur, 'Total', eurHeader).forEach((v, i) => { if (typeof v === 'number') annualWage[years[i]] = v; });

  const bgn = sheet('Labour_2.2.1_BGN_2025-07.xls', '2017 - 2023 КИД2008');
  const bgnHeader = yearHeader(bgn, 2017);
  const bgYears = bgn[bgnHeader].slice(1);
  rowValues(bgn, 'Общо', bgnHeader).forEach((v, i) => {
    const y = bgYears[i];
    if (typeof v !== 'number') return;
    if (annualWage[y]) check(Math.abs(annualWage[y] - toEur(v)) < 2, `annual wage ${y}: EUR file ${annualWage[y]} vs BGN file ${r2(toEur(v))}`);
    else annualWage[y] = toEur(v);
  });
  annualWage[2016] = toEur(rowValues(sheet('Labour_2.2.1_EN_2022-03.xls', '2016NaceRev2'), 'Total')[0]);
  annualWage[2015] = toEur(rowValues(sheet('Labour_2.2.1_BGN_2017-02.xls', '2015КИД2008'), 'Общо')[0]);
  annualWage[2025] = toEur(official.annualWage2025.bgn);
}
check(Object.keys(annualWage).length === 11, `expected annual wages 2015-2025, got ${Object.keys(annualWage).join(',')}`);

// Structure of Earnings Survey, October 2022: mean vs median gross monthly earnings.
const ses = rowValues(sheet('Labour_4.2.2.1_EUR_EN.xlsx', 'Ec.activities22'), 'Total');
const ses2022 = { mean: ses[3], median: ses[7] };

// Eurostat
const hicpM = jsonStat('hicp-monthly');
const hicpA = jsonStat('hicp-annual');
const weights = jsonStat('hicp-weights');
const pppBg = jsonStat('ppp-bg');
const pppEu = jsonStat('ppp-eu');
const mwEu = jsonStat('min-wage-eu');
const povertyEurostat = series(jsonStat('poverty-threshold'), { geo: 'BG' });
const gdpReg = jsonStat('gdp-regional');

for (const [y, bgn] of Object.entries(official.poverty.lineBgnPerMonth)) {
  check(Math.abs(toEur(bgn) * 12 - povertyEurostat[y]) < 2, `poverty line ${y}: NSI ${r2(toEur(bgn) * 12)}/yr vs Eurostat ${povertyEurostat[y]}`);
}

// ---------------------------------------------------------------- salaries.json

const QUARTERS = quarters('2019Q1', releases.at(-1).quarter);
const salaries = {
  latestQuarter: QUARTERS.at(-1),
  quarterly: QUARTERS.map((q) => ({
    quarter: q,
    bulgaria: r1(national[q].avg),
    sofia: sofiaQuarterly[q] != null ? r1(sofiaQuarterly[q]) : null,
    minimum: r2(inForce(minWage, quarterStart(q))),
    maxInsurable: r2(inForce(maxIncome, quarterStart(q))),
    topSector: r1(national[q].ict),
  })),
  annual: Object.keys(annualWage).map(Number).sort().map((year) => ({
    year,
    averageMonthly: r1(annualWage[year] / 12),
    minimum: r2(mean(Array.from({ length: 12 }, (_, m) => inForce(minWage, `${year}-${String(m + 1).padStart(2, '0')}-01`)))),
    maxInsurable: r2(mean(Array.from({ length: 12 }, (_, m) => inForce(maxIncome, `${year}-${String(m + 1).padStart(2, '0')}-01`)))),
  })),
  current: {
    date: '2026-10-01',
    minimum: inForce(minWage, '2026-10-01'),
    maxInsurable: inForce(maxIncome, '2026-10-01'),
    maxInsurableBefore: inForce(maxIncome, '2026-07-01'),
    maxInsurableChange: maxIncome.at(-1).from,
  },
  sofiaSectors: official.sofiaLatestQuarters.rows.filter((r) => r.publicSector)
    .map(({ quarter, publicSector, privateSector }) => ({ quarter, publicSector, privateSector })),
  sectors: {
    period: '2026Q1',
    // NSI computes quarter averages from unrounded data, so its published figure is used;
    // it must agree with the mean of the three published monthly values to within €1.
    rows: official.sectorsQ1_2026.rows.map((r) => {
      check(Math.abs(mean(r.eur) - r.published) <= 1, `sector ${r.code}: months mean ${r2(mean(r.eur))} vs published ${r.published}`);
      return { code: r.code, name: SECTORS[r.code], average: r.published, employees: Math.round(mean(r.employees)) };
    }).sort((a, b) => b.average - a.average),
    total: { average: official.sectorsQ1_2026.total.published, employees: Math.round(mean(official.sectorsQ1_2026.total.employees)) },
  },
  districts: {
    period: '2025Q3',
    national: r1(national['2025Q3'].avg),
    rows: Object.entries(districtQuarterly).map(([id, v]) => ({
      id, name: { bg: DISTRICTS[id], en: id === 'Sofia cap.' ? 'Sofia (capital)' : id === 'Sofia' ? 'Sofia (district)' : id },
      average: v['2025Q3'], sofiaCapital: id === 'Sofia cap.',
    })).sort((a, b) => b.average - a.average),
  },
  distribution2022: ses2022,
};

// ---------------------------------------------------------------- inflation.json

const months = Object.keys(series(hicpM, { geo: 'BG', unit: 'RCH_A', coicop18: 'TOTAL' })).sort();
const m = (geo, unit, coicop18) => series(hicpM, { geo, unit, coicop18 });
const bgRate = m('BG', 'RCH_A', 'TOTAL'); const euRate = m('EU27_2020', 'RCH_A', 'TOTAL');
const bgIdx = m('BG', 'I15', 'TOTAL'); const euIdx = m('EU27_2020', 'I15', 'TOTAL');
const food = m('BG', 'RCH_A', 'CP01'); const energy = m('BG', 'RCH_A', 'CP045'); const transport = m('BG', 'RCH_A', 'CP07');
const a = (geo, unit, coicop18) => series(hicpA, { geo, unit, coicop18 });
const years = Object.keys(a('BG', 'RCH_A_AVG', 'TOTAL')).map(Number).sort();
const latestYear = String(years.at(-1));

const inflation = {
  latestMonth: months.at(-1),
  estimatedMonths: flagged(hicpM, { geo: 'BG', unit: 'RCH_A', coicop18: 'TOTAL' }, 'e'),
  monthly: months.map((t) => ({
    month: t, bulgaria: bgRate[t] ?? null, eu: euRate[t] ?? null,
    bulgariaIndex: bgIdx[t] ?? null, euIndex: euIdx[t] ?? null,
    food: food[t] ?? null, energy: energy[t] ?? null, transport: transport[t] ?? null,
  })),
  annual: years.map((y) => ({
    year: y, bulgaria: a('BG', 'RCH_A_AVG', 'TOTAL')[y], eu: a('EU27_2020', 'RCH_A_AVG', 'TOTAL')[y],
    bulgariaIndex: a('BG', 'INX_A_AVG', 'TOTAL')[y], euIndex: a('EU27_2020', 'INX_A_AVG', 'TOTAL')[y],
  })),
  categories: Object.keys(COICOP).map((code) => {
    const idx = a('BG', 'INX_A_AVG', code); const rate = a('BG', 'RCH_A_AVG', code);
    return {
      code, name: COICOP[code],
      since2019: r1((idx[latestYear] / idx['2019'] - 1) * 100),
      rate2022: rate['2022'], rateLatest: rate[latestYear],
    };
  }).sort((x, y) => y.since2019 - x.since2019),
  categoriesLatestYear: years.at(-1),
  weights: {
    year: 2026,
    rows: Object.keys(COICOP).map((code) => ({ code, name: COICOP[code], perMille: series(weights, { coicop18: code })['2026'] }))
      .sort((x, y) => y.perMille - x.perMille),
  },
};

// ---------------------------------------------------------------- purchasing-power.json

const hicpAnnualBg = a('BG', 'INX_A_AVG', 'TOTAL');
const quarterPrice = (q) => mean(monthsOf(q).map((t) => bgIdx[t]));
const base = salaries.annual[0];
const pp = (indic, cat, geo = 'BG') => series(pppBg, { indic_ppp: indic, ppp_cat18: cat, geo });

const hb = official.householdBudget2025;
const spendTotal = Object.values(hb.consumerExpenditureBgn).reduce((s, x) => s + x, 0);
const SPEND_LABELS = {
  food: { bg: 'Храна и безалкохолни напитки', en: 'Food and soft drinks' },
  housing: { bg: 'Жилище и сметки', en: 'Housing and utilities' },
  transportCommunication: { bg: 'Транспорт и комуникации', en: 'Transport and communication' },
  recreationEducation: { bg: 'Отдих, култура, образование', en: 'Recreation, culture, education' },
  health: { bg: 'Здраве', en: 'Health' },
  other: { bg: 'Други (облекло, алкохол, тютюн, разни)', en: 'Other (clothing, alcohol, tobacco, misc.)' },
};
const spend = { ...hb.consumerExpenditureBgn };
spend.other = spend.alcoholTobacco + spend.clothing + spend.miscellaneous;
delete spend.alcoholTobacco; delete spend.clothing; delete spend.miscellaneous;
const INCOME_LABELS = {
  wages: { bg: 'Заплати', en: 'Wages' }, pensions: { bg: 'Пенсии', en: 'Pensions' },
  selfEmployment: { bg: 'Самостоятелна заетост', en: 'Self-employment' },
  socialBenefits: { bg: 'Социални помощи', en: 'Social benefits' }, other: { bg: 'Други', en: 'Other' },
};
const incomeTotal = Object.values(hb.incomeSourcesBgn).reduce((s, x) => s + x, 0);

const purchasingPower = {
  realWages: salaries.annual.filter((r) => hicpAnnualBg[r.year]).map((r) => {
    const prices = hicpAnnualBg[r.year] / hicpAnnualBg[base.year] * 100;
    const nominal = r.averageMonthly / base.averageMonthly * 100;
    const minimum = r.minimum / base.minimum * 100;
    return {
      year: r.year, prices: r1(prices), nominal: r1(nominal), real: r1(nominal / prices * 100),
      minimumNominal: r1(minimum), minimumReal: r1(minimum / prices * 100),
    };
  }),
  realGrowthQuarterly: QUARTERS.slice(4).map((q, i) => {
    const prev = QUARTERS[i];
    const priceGrowth = quarterPrice(q) / quarterPrice(prev);
    const nominal = national[q].avg / national[prev].avg;
    const sofia = sofiaQuarterly[q] && sofiaQuarterly[prev] ? sofiaQuarterly[q] / sofiaQuarterly[prev] : null;
    return {
      quarter: q, nominal: r1((nominal - 1) * 100), inflation: r1((priceGrowth - 1) * 100),
      real: r1((nominal / priceGrowth - 1) * 100), sofiaReal: sofia ? r1((sofia / priceGrowth - 1) * 100) : null,
    };
  }),
  euComparison: {
    year: 2025,
    bulgaria: years.filter((y) => y >= 2015).map((y) => ({
      year: y, consumption: pp('VI_PPS_EU27_2020_HAB', 'A01')[y], gdp: pp('VI_PPS_EU27_2020_HAB', 'GDP')[y],
      priceLevel: pp('PLI_EU27_2020', 'A01')[y],
    })),
    countries: pick(pppEu, { indic_ppp: 'VI_PPS_EU27_2020_HAB' }).map((r) => ({
      geo: r.geo, name: country(r.geo), consumption: r.value,
      priceLevel: series(pppEu, { indic_ppp: 'PLI_EU27_2020', geo: r.geo })['2025'],
    })).sort((x, y) => x.consumption - y.consumption),
  },
  minimumWageEU: {
    period: '2026-S1',
    rows: pick(mwEu, { currency: 'EUR' }).filter((r) => r.geo !== 'EU27_2020').map((r) => ({
      geo: r.geo, name: country(r.geo), eur: r.value,
      pps: series(mwEu, { currency: 'PPS', geo: r.geo })['2026-S1'],
    })).sort((x, y) => x.eur - y.eur),
  },
  poverty: salaries.annual.filter((r) => povertyEurostat[r.year]).map((r) => ({
    year: r.year, line: r1(povertyEurostat[r.year] / 12), minimum: r.minimum, average: r.averageMonthly,
    rate: official.poverty.ratePercent[r.year] ?? null,
  })),
  inWorkPoverty2025: official.poverty.inWorkRate2025,
  household: {
    year: 2025,
    spending: Object.entries(spend).map(([key, bgn]) => ({ key, name: SPEND_LABELS[key], perYear: r1(toEur(bgn)), share: r1(bgn / spendTotal * 100) }))
      .sort((x, y) => (x.key === 'other') - (y.key === 'other') || y.perYear - x.perYear),
    income: Object.entries(hb.incomeSourcesBgn).map(([key, bgn]) => ({ key, name: INCOME_LABELS[key], perYear: r1(toEur(bgn)), share: r1(bgn / incomeTotal * 100) })),
    taxesShareOfExpenditure: r1(hb.taxesAndContributionsBgn / hb.totalExpenditureBgn * 100),
    realIncomeIndex: Object.entries(hb.realIncomeIndex2016).map(([year, index]) => ({ year: +year, index })),
  },
  regionalGdp: Object.keys(series(gdpReg, { geo: 'BG411' })).sort().map((y) => ({
    year: +y, bulgaria: series(gdpReg, { geo: 'BG' })[y], sofia: series(gdpReg, { geo: 'BG411' })[y],
  })),
};

// ---------------------------------------------------------------- sources.json

const updated = (file) => readJson(`eurostat/${file}.json`).updated;
const eurostat = (code, file, bg, en) => ({ publisher: { bg: 'Евростат', en: 'Eurostat' }, title: { bg, en }, code, updated: updated(file),
  url: `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table` });
const nsi = (bg, en, url) => ({ publisher: { bg: 'НСИ', en: 'NSI' }, title: { bg, en }, url });
const nsiArchive = 'https://web.archive.org/web/2026/https://www.nsi.bg/sites/default/files/files/data/timeseries/';
const sources = {
  builtAt: new Date().toISOString().slice(0, 10),
  conversionRate: BGN_PER_EUR,
  list: [
    nsi('Наети лица и средна брутна заплата — тримесечни съобщения 2019–2026', 'Employees and average wages and salaries — quarterly releases 2019–2026', releases.findLast((r) => r.source.includes('nsi.bg')).source),
    // Quarters newer than the archive are cited from BTA's report of the NSI release.
    ...releases.filter((r) => r.source.includes('bta.bg')).map((r) => {
      const [y, q] = r.quarter.split('Q');
      return { publisher: { bg: 'БТА (по данни на НСИ)', en: 'BTA (citing NSI)' }, title: { bg: `Средна брутна заплата — ${['I', 'II', 'III', 'IV'][q - 1]} тримесечие ${y}`, en: `Average gross wage — Q${q} ${y}` }, url: r.source };
    }),
    nsi('Средна брутна месечна заплата по статистически райони и области (Labour_1.1.2.2, евро)', 'Average gross monthly wages by statistical regions and districts (Labour_1.1.2.2, EUR)', `${nsiArchive}Labour_1.1.2.2_EUR_EN.xlsx`),
    nsi('Средна годишна заплата по икономически дейности (Labour_2.2.1)', 'Average annual wages and salaries by economic activity (Labour_2.2.1)', `${nsiArchive}Labour_2.2.1_EUR_EN.xlsx`),
    nsi('Изследване на структурата на заплатите 2022 (Labour_4.2.2.1)', 'Structure of Earnings Survey 2022 (Labour_4.2.2.1)', `${nsiArchive}Labour_4.2.2.1_EUR_EN.xlsx`),
    nsi('ТСБ на НСИ — тримесечни съобщения за област София (столица)', 'NSI regional bureau — quarterly releases for Sofia (capital)', official.sofiaLatestQuarters.rows.at(-1).url),
    nsi('Доходи, разходи и потребление на домакинствата — 2025', 'Household income, expenditure and consumption — 2025', official.householdBudget2025.url),
    nsi('Показатели за бедност и социално включване — 2025', 'Poverty and social inclusion indicators — 2025', official.poverty.url),
    { publisher: { bg: 'НОИ', en: 'NSSI' }, title: { bg: 'Размер на осигурителните вноски и осигурителния доход по години', en: 'Social security contribution rates and insurable income by year' }, url: official.maxInsurableIncome.url },
    { publisher: { bg: 'Министерски съвет', en: 'Council of Ministers' }, title: { bg: 'Постановления за минималната работна заплата (сверени с Евростат earn_mw_cur)', en: 'Decrees on the minimum wage (cross-checked with Eurostat earn_mw_cur)' }, url: official.minimumWage.url },
    eurostat('prc_hicp_minr', 'hicp-monthly', 'ХИПЦ — месечни изменения и индекси', 'HICP — monthly rates of change and indices'),
    eurostat('prc_hicp_ainr', 'hicp-annual', 'ХИПЦ — годишни данни', 'HICP — annual data'),
    eurostat('prc_hicp_iw', 'hicp-weights', 'ХИПЦ — тегла на групите', 'HICP — item weights'),
    eurostat('prc_ppp_ind_1', 'ppp-bg', 'Паритети на покупателната способност и ценови равнища', 'Purchasing power parities and price level indices'),
    eurostat('earn_mw_cur', 'min-wage-eu', 'Минимални месечни заплати', 'Monthly minimum wages'),
    eurostat('ilc_li01', 'poverty-threshold', 'Прагове на риска от бедност', 'At-risk-of-poverty thresholds'),
    eurostat('nama_10r_3gdp', 'gdp-regional', 'БВП по области (NUTS 3)', 'GDP by NUTS 3 region'),
  ],
};

// ---------------------------------------------------------------- write

const out = new URL('src/data/', root);
mkdirSync(out, { recursive: true });
for (const [name, data] of Object.entries({ salaries, inflation, 'purchasing-power': purchasingPower, sources })) {
  writeFileSync(new URL(`${name}.json`, out), `${JSON.stringify(data, null, 1)}\n`);
  console.log(`src/data/${name}.json`);
}
if (warnings.length) {
  console.warn(`\n${warnings.length} cross-check warning(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
} else console.log('All cross-checks passed.');
