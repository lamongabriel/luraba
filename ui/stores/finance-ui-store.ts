import { create } from "zustand"

export type AccountScope = "all" | "assets" | "debts"

type FinanceUiState = {
  accountScope: AccountScope
  setAccountScope: (scope: AccountScope) => void
}

export const useFinanceUiStore = create<FinanceUiState>((set) => ({
  accountScope: "all",
  setAccountScope: (scope) => set({ accountScope: scope }),
}))
