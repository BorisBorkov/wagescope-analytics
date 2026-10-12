import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeFormat } from './format.js';
import { translate } from './i18n.js';
import { palette } from './theme.js';

const SettingsContext = createContext(null);

// Per-viewer preferences only; storage can be unavailable (private mode), so every access is guarded.
function stored(key, fallback, allowed) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function persist(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function useSystemDark() {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => stored('lang', 'bg', ['bg', 'en']));
  const [currency, setCurrency] = useState(() => stored('currency', 'EUR', ['EUR', 'BGN']));
  const [theme, setTheme] = useState(() => stored('theme', 'auto', ['auto', 'light', 'dark']));
  const systemDark = useSystemDark();
  const mode = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => { persist('lang', lang); document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { persist('currency', currency); }, [currency]);
  useEffect(() => {
    persist('theme', theme);
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => ({
    lang, setLang, currency, setCurrency, theme, setTheme,
    t: (key, vars) => translate(lang, key, vars),
    f: makeFormat(lang, currency),
    colors: palette(mode),
  }), [lang, currency, theme, mode]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
