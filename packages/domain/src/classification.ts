export type AccountClassification = "asset" | "liability";

export function toDisplayedBalance(
  rawBalance: number,
  classification: AccountClassification,
): number {
  return classification === "asset" ? rawBalance : -rawBalance;
}

export function toRawBalance(
  displayedBalance: number,
  classification: AccountClassification,
): number {
  return classification === "asset" ? displayedBalance : -displayedBalance;
}
