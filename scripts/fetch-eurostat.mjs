// Downloads the raw Eurostat datasets (JSON-stat 2.0) into data/raw/eurostat/.
// Run: npm run data:fetch
import { mkdir, writeFile } from 'node:fs/promises';

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const OUT = new URL('../data/raw/eurostat/', import.meta.url);

const EU = ['BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'HR', 'IT', 'CY', 'LV', 'LT',
  'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE', 'EU27_2020'];
const DIVISIONS = ['CP01', 'CP02', 'CP03', 'CP04', 'CP05', 'CP06', 'CP07', 'CP08', 'CP09', 'CP10', 'CP11', 'CP12', 'CP13'];

const DATASETS = [
  // Minimum wage — Bulgaria (EUR and PPS), half-yearly
  { file: 'min-wage-bg', code: 'earn_mw_cur', params: { geo: ['BG'], currency: ['EUR', 'PPS'], sinceTimePeriod: '2015' } },
  // Minimum wage — EU member states, first half of 2026
  { file: 'min-wage-eu', code: 'earn_mw_cur', params: { geo: EU, currency: ['EUR', 'PPS'], time: '2026-S1' } },
  // HICP monthly: annual rate of change (%) and index 2015=100
  { file: 'hicp-monthly', code: 'prc_hicp_minr', params: { geo: ['BG', 'EU27_2020'], unit: ['RCH_A', 'I15'], coicop18: ['TOTAL', 'CP01', 'CP045', 'CP07'], sinceTimePeriod: '2015-01' } },
  // HICP annual: annual average rate of change (%) and annual average index (2015=100)
  { file: 'hicp-annual', code: 'prc_hicp_ainr', params: { geo: ['BG', 'EU27_2020'], unit: ['RCH_A_AVG', 'INX_A_AVG'], coicop18: ['TOTAL', ...DIVISIONS], sinceTimePeriod: '2015' } },
  // HICP item weights of the consumer basket (per mille), 2026
  { file: 'hicp-weights', code: 'prc_hicp_iw', params: { geo: ['BG'], coicop18: DIVISIONS, time: '2026' } },
  // Purchasing power parities: price level and real volume per capita (EU27 = 100)
  { file: 'ppp-bg', code: 'prc_ppp_ind_1', params: { geo: ['BG', 'EU27_2020'], indic_ppp: ['PLI_EU27_2020', 'VI_PPS_EU27_2020_HAB'], ppp_cat18: ['GDP', 'A01'], sinceTimePeriod: '2015' } },
  { file: 'ppp-eu', code: 'prc_ppp_ind_1', params: { geo: EU, indic_ppp: ['VI_PPS_EU27_2020_HAB', 'PLI_EU27_2020'], ppp_cat18: ['A01'], time: '2025' } },
  // At-risk-of-poverty threshold: 60% of median equivalised income, one adult (EUR per year)
  { file: 'poverty-threshold', code: 'ilc_li01', params: { geo: ['BG'], hhcomp: ['A1'], rskpovth: ['B_60'], statinfo: ['MED_EI'], unit: ['EUR'], sinceTimePeriod: '2015' } },
  // GDP per capita in PPS (% of EU27) — Bulgaria and Sofia (capital), NUTS 3 = BG411
  { file: 'gdp-regional', code: 'nama_10r_3gdp', params: { geo: ['BG', 'BG411'], unit: ['PPS_HAB_EU27_2020'], sinceTimePeriod: '2015' } },
];

function url({ code, params }) {
  const q = new URLSearchParams({ format: 'JSON', lang: 'EN' });
  for (const [k, v] of Object.entries(params)) for (const x of [v].flat()) q.append(k, x);
  return `${API}/${code}?${q}`;
}

await mkdir(OUT, { recursive: true });
for (const ds of DATASETS) {
  const res = await fetch(url(ds));
  if (!res.ok) throw new Error(`${ds.code}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.value) throw new Error(`${ds.code}: empty response`);
  await writeFile(new URL(`${ds.file}.json`, OUT), JSON.stringify(json));
  console.log(`${ds.file}.json  <-  ${ds.code}  (updated ${json.updated})`);
}
