export type ChartStatus = "ready" | "loading" | "error";

export type ChartDatum = object;

export interface ChartProps {
  title: string;
  status?: ChartStatus;
  errorMessage?: string;
  className?: string;
}

export interface CartesianChartProps<TData extends ChartDatum> extends ChartProps {
  data: TData[];
  categoryKey: Extract<keyof TData, string>;
  valueKey: Extract<keyof TData, string>;
  valueLabel?: string;
  formatValue?: (value: number) => string;
}

export interface DonutChartDatum extends ChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartProps extends ChartProps {
  data: DonutChartDatum[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
}

/** A line, area or bar series of money (minor units) inside a row of `data`. */
export interface MoneySeries {
  /** The key in each data row. Must be a simple identifier (`balance`, `moneyIn`). */
  key: string;
  label: string;
  /** Any CSS color; defaults to the next palette color. */
  color?: string;
}

/** One slice of a `DonutChartCard`, `value` in minor units. */
export interface DonutSlice {
  id?: string | null;
  name: string;
  value: number;
  color?: string | null;
}
