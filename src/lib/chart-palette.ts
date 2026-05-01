export const CHART_PALETTE = [
  "#e07052",
  "#4e9fd4",
  "#5ab87a",
  "#9b72cf",
  "#e8c14a",
  "#e05580",
  "#4fc4c4",
  "#f0923b",
] as const;

export function buildColorMap(keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k, i) => [k, CHART_PALETTE[i % CHART_PALETTE.length]]));
}
