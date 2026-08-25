import type { CreditCard, CreditCardCycle } from "@/interfaces/credit-card"

export function getCreditCardUtilization(card: CreditCard) {
  if (card.creditLimitAmount <= 0) return null

  return Math.min(
    100,
    Math.max(0, (card.balance / card.creditLimitAmount) * 100),
  )
}

export function getCurrentCreditCardCycle(cycles: CreditCardCycle[]) {
  return cycles.find((cycle) => cycle.isCurrent)
}

export function getNextCreditCardCycle(cycles: CreditCardCycle[]) {
  return cycles.find((cycle) => cycle.isNext)
}

export function getCycleAmount(cycle: CreditCardCycle | undefined) {
  return cycle?.remainingAmount ?? 0
}
