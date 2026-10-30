import type { InvestmentEventType } from "@luraba/contracts";

/** Which inputs each transaction type needs. One place, so the form and its validation agree. */
export type EventFields = {
  asset: boolean;
  quantity: "required" | "optional" | false;
  unitPrice: "required" | "optional" | false;
  gross: "required" | "optional" | false;
  fees: boolean;
  taxes: boolean;
  ratio: boolean;
  target: boolean;
  exchangeRatio: boolean;
  costRatio: boolean;
  /** Short hint shown under the type picker. */
  hint: string;
};

const NONE: EventFields = {
  asset: false,
  quantity: false,
  unitPrice: false,
  gross: false,
  fees: false,
  taxes: false,
  ratio: false,
  target: false,
  exchangeRatio: false,
  costRatio: false,
  hint: "",
};

const trade = (extra: Partial<EventFields> = {}): EventFields => ({
  ...NONE,
  asset: true,
  quantity: "required",
  unitPrice: "required",
  gross: "optional",
  fees: true,
  ...extra,
});
const income = (extra: Partial<EventFields> = {}): EventFields => ({
  ...NONE,
  asset: true,
  gross: "required",
  taxes: true,
  ...extra,
});
const cash = (extra: Partial<EventFields> = {}): EventFields => ({
  ...NONE,
  gross: "required",
  ...extra,
});

export const EVENT_FIELDS: Partial<Record<InvestmentEventType, EventFields>> = {
  BUY: trade({ hint: "Fees are added to your cost." }),
  SELL: trade({ taxes: true, hint: "Taxes withheld at the source (leave empty if none)." }),
  SUBSCRIPTION: trade({ hint: "Shares bought in an offering or subscription." }),
  DIVIDEND: income({ hint: "Leave taxes empty to use the estimated withholding." }),
  JCP: income({
    hint: "Interest on equity. Brazilian withholding is estimated when taxes are empty.",
  }),
  FII_INCOME: income({ hint: "Monthly income from a REIT fund." }),
  COUPON: income(),
  BOND_INTEREST: income(),
  AMORTIZATION: income({ hint: "Reduces your cost basis when it is a return of principal." }),
  RETURN_OF_CAPITAL: income({ hint: "Reduces your cost basis." }),
  SPLIT: { ...NONE, asset: true, ratio: true, hint: "2 for 1 means ratio 1 → 2." },
  REVERSE_SPLIT: { ...NONE, asset: true, ratio: true, hint: "10 for 1 means ratio 10 → 1." },
  BONUS_SHARES: {
    ...NONE,
    asset: true,
    quantity: "required",
    unitPrice: "optional",
    hint: "New shares received. Add a unit price if the cost is assigned.",
  },
  SUBSCRIPTION_RIGHT_RECEIVED: { ...NONE, asset: true, quantity: "required" },
  SPIN_OFF: {
    ...NONE,
    asset: true,
    target: true,
    exchangeRatio: true,
    costRatio: true,
    hint: "Choose the new asset and the share of the cost that moves to it.",
  },
  MERGER: {
    ...NONE,
    asset: true,
    target: true,
    exchangeRatio: true,
    hint: "Your shares convert into the other asset at the exchange ratio.",
  },
  TICKER_CHANGE: { ...NONE, asset: true, target: true, hint: "Same company, new symbol." },
  DELISTING: { ...NONE, asset: true },
  FI_APPLICATION: trade({
    taxes: false,
    hint: "For a CDB or bond: quantity 1 and the amount applied as the unit price.",
  }),
  FI_REDEMPTION: trade({
    taxes: true,
    hint: "Quantity is the share redeemed (1 for the whole position).",
  }),
  FI_MATURITY: trade({ taxes: true, hint: "Paid out at maturity." }),
  DEPOSIT: cash(),
  WITHDRAWAL: cash(),
  FEE: cash(),
  TAX_PAYMENT: cash(),
  INTEREST_ON_CASH: cash(),
};

/** Types offered in the "New transaction" form, grouped for the picker. */
export const EVENT_TYPE_GROUPS: Array<{ label: string; types: InvestmentEventType[] }> = [
  { label: "Trades", types: ["BUY", "SELL", "SUBSCRIPTION"] },
  {
    label: "Income",
    types: [
      "DIVIDEND",
      "JCP",
      "FII_INCOME",
      "COUPON",
      "BOND_INTEREST",
      "AMORTIZATION",
      "RETURN_OF_CAPITAL",
    ],
  },
  { label: "Fixed income", types: ["FI_APPLICATION", "FI_REDEMPTION", "FI_MATURITY"] },
  {
    label: "Corporate actions",
    types: [
      "SPLIT",
      "REVERSE_SPLIT",
      "BONUS_SHARES",
      "SUBSCRIPTION_RIGHT_RECEIVED",
      "SPIN_OFF",
      "MERGER",
      "TICKER_CHANGE",
      "DELISTING",
    ],
  },
  { label: "Cash", types: ["DEPOSIT", "WITHDRAWAL", "FEE", "TAX_PAYMENT", "INTEREST_ON_CASH"] },
];

export function fieldsFor(type: InvestmentEventType): EventFields {
  return EVENT_FIELDS[type] ?? NONE;
}
