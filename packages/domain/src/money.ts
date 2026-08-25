export function addMinorUnits(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function subtractMinorUnits(amount: number, ...subtrahends: number[]): number {
  return subtrahends.reduce((total, subtrahend) => total - subtrahend, amount);
}

export function toMinorUnits(value: number, precision: number): number {
  return Math.round(value * 10 ** precision);
}

export function fromMinorUnits(value: number, precision: number): number {
  return value / 10 ** precision;
}
