export type Account = {
  id: string
  name: string
  type: "asset" | "debt"
  balance: string
  monthDelta: string
}

export type Transaction = {
  id: string
  title: string
  account: string
  category: string
  date: string
  amount: string
  kind: "income" | "expense" | "transfer"
}

export const accounts: Account[] = [
  { id: "a1", name: "Cash", type: "asset", balance: "R$5.899,26", monthDelta: "+188.7%" },
  { id: "a2", name: "Investment", type: "asset", balance: "R$5.104,20", monthDelta: "-15.0%" },
  { id: "a3", name: "Credit Card", type: "debt", balance: "R$784,54", monthDelta: "-88.0%" },
  { id: "a4", name: "Loan", type: "debt", balance: "R$53.750,00", monthDelta: "-2.3%" },
]

export const transactions: Transaction[] = [
  {
    id: "t1",
    title: "Payment to Credit Card - XP Infinite",
    account: "Transfer • Checking - XP Brazil",
    category: "Payment",
    date: "Mar 03, 2026",
    amount: "+/- R$865,97",
    kind: "transfer",
  },
  {
    id: "t2",
    title: "FNF - Freelance",
    account: "Checking - Inter Brazil",
    category: "Income",
    date: "Mar 01, 2026",
    amount: "R$1.250,00",
    kind: "income",
  },
  {
    id: "t3",
    title: "Shopee - Office Desk",
    account: "Credit Card - XP Infinite Brazil",
    category: "Office & Computing",
    date: "Mar 01, 2026",
    amount: "-R$69,08",
    kind: "expense",
  },
]

export const budgetCategories = [
  { name: "Travel", spent: "R$1.414,00", budgeted: "R$0,00", status: "Over Budget" },
  { name: "Gaming & Hobbies", spent: "R$443,58", budgeted: "R$0,00", status: "Over Budget" },
  { name: "Office & Computing", spent: "R$69,08", budgeted: "R$0,00", status: "Over Budget" },
  { name: "Uncategorized", spent: "R$0,00", budgeted: "R$5.000,00", status: "On Track" },
]

export async function getDashboardSnapshot() {
  return {
    income: "R$15.255,90",
    expenses: "R$6.226,00",
    net: "R$9.029,90",
    transactionCount: 459,
  }
}
