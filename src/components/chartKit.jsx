// Shared chart chrome: recessive hairline axes and grid, thin marks, selective direct labels.
import { useEffect, useState } from 'react';

const NARROW = '(max-width: 560px)';
/** True on phone-width screens, where category axes get a narrower label column. */
export function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return narrow;
}

/** Width and truncation length for a category axis of long names (≈7px per Cyrillic character at 12px). */
export const categoryAxis = (narrow, wide = 196) => {
  const width = narrow ? 124 : wide;
  return { width, max: Math.floor((width - 8) / 7) };
};

export const axisProps = (colors) => ({
  tick: { fill: colors.muted, fontSize: 12 },
  axisLine: { stroke: colors.axis },
  tickLine: false,
});

export const gridProps = (colors, direction = 'horizontal') => ({
  stroke: colors.grid,
  vertical: direction === 'vertical',
  horizontal: direction === 'horizontal',
});

export const lineProps = (color) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  dot: false,
  isAnimationActive: false,
  connectNulls: false,
});

export const activeDot = (colors, color) => ({ r: 4, fill: color, stroke: colors.surface, strokeWidth: 2 });

export const cursorProps = (colors) => ({ stroke: colors.axis, strokeWidth: 1 });

/** Line label that only renders at the last point: the value at the end of the line. */
export const endLabel = (lastIndex, text, colors, dy = 4) => function EndLabel({ x, y, index }) {
  if (index !== lastIndex || x == null) return null;
  return <text x={x + 8} y={y} dy={dy} fill={colors.ink2} fontSize={12} fontWeight={600}>{text}</text>;
};

/** Bar label shown only for the given indexes (the extreme or the bar the story is about). */
export const pickLabel = (indexes, format, colors, horizontal = false) => function PickedLabel({ x, y, width, height, value, index }) {
  if (!indexes.includes(index) || value == null) return null;
  if (horizontal) {
    return <text x={x + width + 6} y={y + height / 2} dy={4} fill={colors.ink2} fontSize={12} fontWeight={600}>{format(value)}</text>;
  }
  const up = value >= 0;
  return <text x={x + width / 2} y={up ? y - 6 : y + height + 14} textAnchor="middle" fill={colors.ink2} fontSize={12} fontWeight={600}>{format(value)}</text>;
};

/**
 * Bar shape with a 4px rounded data end and a square baseline — for negative values too
 * (Recharts' `radius` always rounds the same side). Use as <Bar shape={roundedBar('vertical')} />.
 */
export const roundedBar = (layout = 'vertical') => function RoundedBar({ x, y, width, height, fill, value }) {
  if (!width || !height) return null;
  const v = Array.isArray(value) ? value[1] - value[0] : value;
  const [l, t, w, h] = [Math.min(x, x + width), Math.min(y, y + height), Math.abs(width), Math.abs(height)];
  const r = Math.min(4, (layout === 'vertical' ? w : h) / 2, layout === 'vertical' ? h : w);
  const d = layout === 'vertical'
    ? (v >= 0
      ? `M${l},${t + h}V${t + r}Q${l},${t} ${l + r},${t}H${l + w - r}Q${l + w},${t} ${l + w},${t + r}V${t + h}Z`
      : `M${l},${t}H${l + w}V${t + h - r}Q${l + w},${t + h} ${l + w - r},${t + h}H${l + r}Q${l},${t + h} ${l},${t + h - r}Z`)
    : (v >= 0
      ? `M${l},${t}H${l + w - r}Q${l + w},${t} ${l + w},${t + r}V${t + h - r}Q${l + w},${t + h} ${l + w - r},${t + h}H${l}Z`
      : `M${l + w},${t}H${l + r}Q${l},${t} ${l},${t + r}V${t + h - r}Q${l},${t + h} ${l + r},${t + h}H${l + w}Z`);
  return <path d={d} fill={fill} />;
};

/** Category axis tick for horizontal bars: truncates long names and keeps the full name as a tooltip. */
export function CategoryTick({ x, y, payload, fill, max = 30, bold }) {
  const full = String(payload.value);
  const text = full.length > max ? `${full.slice(0, max - 1)}…` : full;
  return (
    <text x={x - 6} y={y} dy={4} textAnchor="end" fill={fill} fontSize={12} fontWeight={bold?.(full) ? 700 : 400}>
      <title>{full}</title>
      {text}
    </text>
  );
}

/** Ticks on the first period of each year, labelled with the year. */
export const yearTicks = (keys, step = 1) => keys.filter((k) => /(Q1|-01)$/.test(k)).filter((_, i) => i % step === 0);
export const yearOf = (k) => k.slice(0, 4);
