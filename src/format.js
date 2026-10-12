const BGN_PER_EUR = 1.95583;

const LOCALE = { bg: 'bg-BG', en: 'en-GB' };
const MONTHS = {
  bg: ['ян.', 'февр.', 'март', 'апр.', 'май', 'юни', 'юли', 'авг.', 'септ.', 'окт.', 'ноем.', 'дек.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const ROMAN = ['I', 'II', 'III', 'IV'];

/** Formatting helpers bound to the current language and display currency. Money inputs are always EUR. */
export function makeFormat(lang, currency) {
  const locale = LOCALE[lang];
  const nf = (digits) => new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const num = (v, digits = 0) => (v == null || Number.isNaN(v) ? '–' : nf(digits).format(v));
  const toDisplay = (eur) => (currency === 'BGN' ? eur * BGN_PER_EUR : eur);
  const symbol = currency === 'BGN' ? (lang === 'bg' ? 'лв.' : 'BGN') : '€';

  // A non-breaking space keeps the amount and its symbol on one line.
  const withSymbol = (n) => (currency === 'EUR' && lang === 'en' ? `€${n}` : `${n}\u00a0${symbol}`);
  /** Money with symbol from a EUR amount. digits: decimals (default 0). */
  const money = (eur, digits = 0) => (eur == null ? '–' : withSymbol(num(toDisplay(eur), digits)));
  /** Money with symbol from a value already in the display currency (chart data). */
  const shown = (v, digits = 0) => (v == null ? '–' : withSymbol(num(v, digits)));
  const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
  const pct = (v, digits = 1) => (v == null ? '–' : `${num(v, digits)}%`);
  const signedPct = (v, digits = 1) => (v == null ? '–' : `${sign(v)}${num(Math.abs(v), digits)}%`);

  const quarter = (q) => {
    const [y, n] = [q.slice(0, 4), +q.at(-1)];
    return lang === 'bg' ? `${ROMAN[n - 1]} тр. ${y}` : `Q${n} ${y}`;
  };
  const month = (m) => {
    const [y, mm] = m.split('-');
    return `${MONTHS[lang][+mm - 1]} ${y}`;
  };

  return {
    num, pct, signedPct, money, shown, quarter, month,
    /** Amounts set by law (minimum wage, ceiling): cents in euro, whole leva (BGN values are conversions). */
    exact: (eur) => money(eur, currency === 'EUR' ? 2 : 0),
    /** EUR amount → number in the display currency, for chart data. */
    value: toDisplay,
    times: (v, digits = 2) => `×${num(v, digits)}`,
    ordinal: (n) => {
      const teen = n % 100 >= 11 && n % 100 <= 19;
      if (lang === 'bg') return `${n}-${teen ? 'а' : ['а', 'ва', 'ра', 'та', 'та', 'а', 'а', 'ма', 'ма', 'а'][n % 10]}`; // feminine: 1-ва, 3-та, 7-ма
      return `${n}${teen || n % 10 > 3 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10]}`;
    },
  };
}
