import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/shared/errors";
import {
  absoluteAmount,
  type DetailedTransactionRow,
  mapDetailedRows,
  resolveTransferAmounts,
  toRawLedgerBalance,
} from "../transactions.helpers";

const postedDate = new Date("2026-03-24T00:00:00.000Z");

function buildDetailedRow(overrides: Partial<DetailedTransactionRow>): DetailedTransactionRow {
  return {
    transactionId: "transaction-id",
    type: "expense",
    description: "Transaction",
    includeInBudget: true,
    merchantId: null,
    purchaseDate: postedDate,
    postedDate,
    createdAt: postedDate,
    updatedAt: postedDate,
    paymentMethodId: "payment-method-id",
    paymentMethodCode: "pix",
    paymentMethodName: "Pix",
    paymentMethodScope: null,
    paymentMethodTranslationKey: "paymentMethods.system.pix",
    tagId: null,
    tagName: null,
    tagColor: null,
    tagIcon: null,
    entryId: "entry-id",
    entryAmount: -2_500,
    entryCurrencyCode: "BRL",
    categoryId: "category-id",
    ownerType: "account",
    ownerId: "account-id",
    ledgerClassification: "asset",
    accountId: "account-id",
    accountName: "Checking",
    accountClassification: "asset",
    ...overrides,
  };
}

describe("transactions helpers", () => {
  it("normalizes displayed ledger amounts", () => {
    expect(absoluteAmount(-100)).toBe(100);
    expect(absoluteAmount(100)).toBe(100);
    expect(toRawLedgerBalance(100, "asset")).toBe(100);
    expect(toRawLedgerBalance(100, "liability")).toBe(-100);
  });

  it("resolves same-currency transfer amounts without FX", async () => {
    const convertAmount = vi.fn();

    await expect(
      resolveTransferAmounts({
        fromCurrencyCode: "BRL",
        toCurrencyCode: "BRL",
        fromAmount: 10_000,
        postedDate,
        convertAmount,
      }),
    ).resolves.toEqual({ fromAmount: 10_000, toAmount: 10_000 });
    expect(convertAmount).not.toHaveBeenCalled();
  });

  it("rejects same-currency transfers with different source and destination amounts", async () => {
    await expect(
      resolveTransferAmounts({
        fromCurrencyCode: "BRL",
        toCurrencyCode: "BRL",
        fromAmount: 10_000,
        toAmount: 11_000,
        postedDate,
        convertAmount: vi.fn(),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("uses manual cross-currency transfer amounts without FX", async () => {
    const convertAmount = vi.fn();

    await expect(
      resolveTransferAmounts({
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        fromAmount: 10_000,
        toAmount: 55_000,
        postedDate,
        convertAmount,
      }),
    ).resolves.toEqual({ fromAmount: 10_000, toAmount: 55_000 });
    expect(convertAmount).not.toHaveBeenCalled();
  });

  it("calculates the missing destination amount with FX", async () => {
    const convertAmount = vi.fn().mockResolvedValue(55_000);

    await expect(
      resolveTransferAmounts({
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        fromAmount: 10_000,
        postedDate,
        convertAmount,
      }),
    ).resolves.toEqual({ fromAmount: 10_000, toAmount: 55_000 });
    expect(convertAmount).toHaveBeenCalledWith({
      amount: 10_000,
      fromCurrencyCode: "USD",
      toCurrencyCode: "BRL",
      date: postedDate,
    });
  });

  it("calculates the missing source amount with reverse FX", async () => {
    const convertAmount = vi.fn().mockResolvedValue(10_000);

    await expect(
      resolveTransferAmounts({
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        toAmount: 55_000,
        postedDate,
        convertAmount,
      }),
    ).resolves.toEqual({ fromAmount: 10_000, toAmount: 55_000 });
    expect(convertAmount).toHaveBeenCalledWith({
      amount: 55_000,
      fromCurrencyCode: "BRL",
      toCurrencyCode: "USD",
      date: postedDate,
    });
  });

  it("rejects transfers without either amount", async () => {
    await expect(
      resolveTransferAmounts({
        fromCurrencyCode: "USD",
        toCurrencyCode: "BRL",
        postedDate,
        convertAmount: vi.fn(),
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("maps joined transfer rows into one response", () => {
    const rows = [
      buildDetailedRow({
        transactionId: "transfer-id",
        type: "transfer",
        description: "International transfer",
        entryId: "from-entry",
        entryAmount: -10_000,
        entryCurrencyCode: "USD",
        accountId: "usd-account",
        accountName: "USD Checking",
        accountClassification: "asset",
        tagId: "tag-1",
        tagName: "Travel",
        tagColor: "#2563EB",
        tagIcon: "Tag01Icon",
      }),
      buildDetailedRow({
        transactionId: "transfer-id",
        type: "transfer",
        description: "International transfer",
        entryId: "to-entry",
        entryAmount: 55_000,
        entryCurrencyCode: "BRL",
        accountId: "brl-account",
        accountName: "BRL Checking",
        accountClassification: "asset",
        tagId: "tag-1",
        tagName: "Travel",
        tagColor: "#2563EB",
        tagIcon: "Tag01Icon",
      }),
      buildDetailedRow({
        transactionId: "transfer-id",
        type: "transfer",
        description: "International transfer",
        entryId: "system-entry",
        entryAmount: 10_000,
        entryCurrencyCode: "USD",
        accountId: null,
        accountName: null,
        accountClassification: null,
        ownerType: "system",
        ownerId: "00000000-0000-0000-0000-000000000000",
        ledgerClassification: "liability",
        tagId: "tag-2",
        tagName: "Family",
        tagColor: null,
        tagIcon: null,
      }),
    ];

    expect(mapDetailedRows(rows)).toEqual([
      expect.objectContaining({
        id: "transfer-id",
        type: "transfer",
        amount: 10_000,
        currencyCode: "USD",
        toAmount: 55_000,
        toCurrencyCode: "BRL",
        accountId: "usd-account",
        toAccountId: "brl-account",
        tags: [
          { id: "tag-1", name: "Travel", color: "#2563EB", icon: "Tag01Icon" },
          { id: "tag-2", name: "Family", color: null, icon: null },
        ],
      }),
    ]);
  });

  it("maps joined non-transfer rows into one response", () => {
    const rows = [
      buildDetailedRow({
        entryAmount: -2_500,
        paymentMethodScope: null,
        tagId: "tag-1",
        tagName: "Lunch",
      }),
    ];

    expect(mapDetailedRows(rows)).toEqual([
      expect.objectContaining({
        id: "transaction-id",
        type: "expense",
        amount: 2_500,
        currencyCode: "BRL",
        toAmount: null,
        toCurrencyCode: null,
        accountId: "account-id",
        paymentMethodScope: "system",
        purchaseDate: "2026-03-24",
        postedDate: "2026-03-24",
        tags: [{ id: "tag-1", name: "Lunch", color: null, icon: null }],
      }),
    ]);
  });
});
