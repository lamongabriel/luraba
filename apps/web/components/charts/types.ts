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
