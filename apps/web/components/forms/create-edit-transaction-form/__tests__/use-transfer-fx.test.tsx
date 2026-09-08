import { act, renderHook, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { useTransferFx } from "../use-transfer-fx";

const fxState = vi.hoisted(() => ({
  data: {
    fromCurrency: { code: "USD", symbol: "$", precision: 2 },
    toCurrency: { code: "BRL", symbol: "R$", precision: 2 },
    provider: "yahoo-finance2" as const,
    rateDate: "2026-08-01",
    rate: 5.5,
    amount: 1_000,
    convertedAmount: 5_500 as number | undefined,
  },
  isError: false,
  isFetching: false,
  query: undefined as unknown,
  enabled: false,
}));

vi.mock("@/queries/currencies/use-currencies-query", () => ({
  useCurrencyRateQuery: (query: unknown, options: { enabled?: boolean }) => {
    fxState.query = query;
    fxState.enabled = options.enabled ?? true;
    return {
      data: fxState.data,
      isError: fxState.isError,
      isFetching: fxState.isFetching,
    };
  },
}));

const USD_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const BRL_ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_USD_ACCOUNT_ID = "33333333-3333-4333-8333-333333333333";

function account(id: string, name: string, currencyCode: string) {
  return {
    id,
    name,
    currencyCode,
    balance: 0,
    subtype: "checking" as const,
    classification: "asset" as const,
    type: "cash" as const,
    institutionName: null,
    institutionDomain: null,
    institutionLogoUrl: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const lookups: TransactionLookups = {
  accounts: [
    account(USD_ACCOUNT_ID, "USD account", "USD"),
    account(BRL_ACCOUNT_ID, "BRL account", "BRL"),
    account(SECOND_USD_ACCOUNT_ID, "Second USD account", "USD"),
  ],
  creditCards: [],
  categories: [],
  merchants: [],
  tags: [],
  paymentMethods: [],
  currencies: [
    { code: "USD", symbol: "$", precision: 2 },
    { code: "BRL", symbol: "R$", precision: 2 },
  ],
};

function values(overrides: Partial<CreateEditTransactionFormValues> = {}) {
  return {
    kind: "transfer" as const,
    description: "Transfer",
    amount: 10,
    toAmount: "" as const,
    accountId: "",
    fromAccountId: USD_ACCOUNT_ID,
    toAccountId: BRL_ACCOUNT_ID,
    creditCardId: "",
    categoryId: "",
    merchantId: "",
    paymentMethodCode: "",
    purchaseDate: "2026-08-01",
    postedDate: "2026-08-01",
    installmentCount: 1,
    includeInBudget: false,
    tagIds: [],
    ...overrides,
  };
}

function renderTransferFx({
  defaultValues = values(),
  isEdit = false,
}: {
  defaultValues?: CreateEditTransactionFormValues;
  isEdit?: boolean;
} = {}) {
  return renderHook(() => {
    const form = useForm<CreateEditTransactionFormValues>({ defaultValues });
    const fx = useTransferFx({
      form,
      isEdit,
      kind: "transfer",
      lookups,
    });
    return { form, fx };
  });
}

describe("useTransferFx", () => {
  beforeEach(() => {
    fxState.data.convertedAmount = 5_500;
    fxState.isError = false;
    fxState.isFetching = false;
    fxState.query = undefined;
    fxState.enabled = false;
  });

  it("quotes using source minor units, transfer date, and destination precision", async () => {
    const { result } = renderTransferFx();

    await waitFor(() => expect(result.current.form.getValues("toAmount")).toBe(55));
    expect(fxState.enabled).toBe(true);
    expect(fxState.query).toEqual({
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: "2026-08-01",
      amount: 1_000,
    });
  });

  it("preserves a manual destination amount until market rate is requested", async () => {
    const { result } = renderTransferFx();
    await waitFor(() => expect(result.current.form.getValues("toAmount")).toBe(55));

    act(() => {
      result.current.fx.setUsesMarketRate(false);
      result.current.form.setValue("toAmount", 60);
      result.current.form.setValue("amount", 20);
    });

    expect(result.current.form.getValues("toAmount")).toBe(60);
    expect(result.current.fx.usesMarketRate).toBe(false);

    act(() => result.current.fx.setUsesMarketRate(true));
    await waitFor(() => expect(result.current.form.getValues("toAmount")).toBe(55));
  });

  it("mirrors same-currency amounts without enabling FX", async () => {
    const { result } = renderTransferFx({
      defaultValues: values({ toAccountId: SECOND_USD_ACCOUNT_ID }),
    });

    await waitFor(() => expect(result.current.form.getValues("toAmount")).toBe(10));
    expect(result.current.fx.isCrossCurrency).toBe(false);
    expect(fxState.enabled).toBe(false);
  });

  it("opens existing transfers in manual mode and preserves historical values", async () => {
    const { result } = renderTransferFx({
      defaultValues: values({ toAmount: 52 }),
      isEdit: true,
    });

    await waitFor(() => expect(result.current.fx.usesMarketRate).toBe(false));
    expect(result.current.form.getValues("toAmount")).toBe(52);
    expect(fxState.enabled).toBe(false);
  });

  it("allows manual values when the FX lookup fails", async () => {
    fxState.data.convertedAmount = undefined;
    fxState.isError = true;
    const { result } = renderTransferFx({
      defaultValues: values({ toAmount: 54 }),
    });

    await waitFor(() => expect(result.current.fx.rateQuery.isError).toBe(true));
    expect(result.current.form.getValues("toAmount")).toBe(54);
  });
});
