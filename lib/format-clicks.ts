/** 클릭수를 1k / 1M 단위로 축약 (예: 1500 → 1.5k) */
export function formatClicks(count: number | null | undefined): string {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${formatUnit(n / 1000)}k`;
  return `${formatUnit(n / 1_000_000)}M`;
}

function formatUnit(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(/\.0$/, "");
}
