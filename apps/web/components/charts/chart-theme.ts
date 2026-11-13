/**
 * Colors every chart in the app draws with. Categorical series use the theme's `--chart-*` tokens
 * (`globals.css`), so one change there recolors every chart; semantic series (money in / money
 * out) use fixed hues that stay readable on both themes and never rely on color alone (the legend
 * and tooltip always carry the label).
 */
export const CHART_PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

export const CHART_SEMANTIC = {
  positive: "var(--color-chart-positive)",
  negative: "var(--color-chart-negative)",
  neutral: "var(--color-chart-1)",
  /** Close to a limit: a budget at 80-100%. */
  warning: "oklch(0.8 0.16 80)",
} as const;

/** How a gauge or ring reads at a glance. Color is never the only cue: pair it with a label. */
export type ChartTone = "positive" | "warning" | "negative" | "neutral";

export const CHART_TONE_COLOR: Record<ChartTone, string> = {
  positive: CHART_SEMANTIC.positive,
  warning: CHART_SEMANTIC.warning,
  negative: CHART_SEMANTIC.negative,
  neutral: CHART_SEMANTIC.neutral,
};

/** Colour for the nth series or slice when the caller gave none. */
export function paletteColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0];
}

/** Height of the plot area. Loading skeletons use it too, so a card never changes size. */
export const CHART_HEIGHT_CLASS = "h-64";
