// Chart colours. Categorical slots are assigned in fixed order and follow the entity
// (Bulgaria is always slot 1, Sofia always slot 2, and so on). Values validated for
// colour-vision deficiency separation and contrast in both modes.
const LIGHT = {
  surface: '#fcfcfb',
  ink: '#0b0b0b',
  ink2: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  neutral: '#a8a7a0',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  good: '#006300',
  bad: '#d03b3b',
};

const DARK = {
  surface: '#1a1a19',
  ink: '#f0efec',
  ink2: '#c3c2b7',
  muted: '#898781',
  grid: '#2c2c2a',
  axis: '#383835',
  neutral: '#6b6a64',
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
  good: '#0ca30c',
  bad: '#e66767',
};

export const palette = (mode) => (mode === 'dark' ? DARK : LIGHT);
