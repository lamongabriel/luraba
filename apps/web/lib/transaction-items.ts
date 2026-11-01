export interface PricedItem {
  quantity: number | string;
  unitPrice: number | string;
}

/** Sum of `quantity x unitPrice` in minor units (`precision` = the currency's decimal places). */
export function itemsTotalMinor(items: readonly PricedItem[], precision: number): number {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + Math.round(quantity * price * 10 ** precision);
  }, 0);
}

/**
 * How much of the transaction total is still unassigned to items. Negative means the items add up
 * to more than the transaction, which the form refuses.
 */
export function remainingToAllocate(totalMinor: number, allocatedMinor: number): number {
  return totalMinor - allocatedMinor;
}

export function itemsExceedTotal(totalMinor: number, allocatedMinor: number): boolean {
  return allocatedMinor > totalMinor;
}
