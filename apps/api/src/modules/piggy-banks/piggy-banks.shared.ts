import { defaultPiggyDayCount, formatPiggyYield } from "@luraba/contracts/piggy-banks";
import { formatISODate, type PiggyYield } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { accountsRepository } from "@/modules/accounts/accounts.repository";
import type { AccountRecord } from "@/modules/accounts/accounts.types";
import { ledgerAccountsRepository } from "@/modules/ledger-accounts/ledger-accounts.repository";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { piggyBanksRepository } from "./piggy-banks.repository";
import type { PiggyBankRecord } from "./piggy-banks.types";

export type PiggyWithParent = PiggyBankRecord & { parentAccountName: string };

export function yieldConfigOf(piggy: PiggyBankRecord): PiggyYield {
  return {
    type: piggy.yieldType as PiggyYield["type"],
    rate: Number(piggy.yieldRate),
    dayCount: piggy.dayCount === 252 ? 252 : 365,
  };
}

export function yieldLabelOf(piggy: PiggyBankRecord): string {
  return formatPiggyYield({
    type: piggy.yieldType as PiggyYield["type"],
    rate: Number(piggy.yieldRate),
  });
}

export function normalizeYield(
  input:
    | {
        type: PiggyYield["type"];
        rate: number;
        dayCount?: 252 | 365;
        maturityDate?: Date | null;
        liquidity?: "daily" | "at_maturity";
        taxRegime?: "none" | "regressive_ir";
        applyIof?: boolean;
      }
    | undefined,
): Pick<
  typeof import("@luraba/db/schemas/piggy-banks.schema").piggyBanksTable.$inferInsert,
  "yieldType" | "yieldRate" | "dayCount" | "maturityDate" | "liquidity" | "taxRegime" | "applyIof"
> {
  if (!input) {
    return {
      yieldType: "none",
      yieldRate: "0",
      dayCount: 365,
      maturityDate: null,
      liquidity: "daily",
      taxRegime: "none",
      applyIof: false,
    };
  }
  if (input.type !== "none" && input.rate <= 0) {
    throw new ValidationError("A yield needs a rate above zero");
  }
  const cdiLike = input.type === "cdi_percent" || input.type === "selic_percent";
  return {
    yieldType: input.type,
    yieldRate: String(input.type === "none" ? 0 : input.rate),
    dayCount: cdiLike ? 252 : (input.dayCount ?? defaultPiggyDayCount(input.type)),
    maturityDate: input.maturityDate ?? null,
    liquidity: input.liquidity ?? "daily",
    taxRegime: input.taxRegime ?? "none",
    applyIof: input.applyIof ?? false,
  };
}

export async function requirePiggyBank(
  context: HouseholdContext,
  id: string,
): Promise<PiggyBankRecord> {
  const piggy = await piggyBanksRepository.get(id, context);
  if (!piggy) throw new NotFoundError("Piggy bank");
  return piggy;
}

export async function requireParentAccount(
  context: HouseholdContext,
  accountId: string,
): Promise<AccountRecord> {
  const account = await accountsRepository.get(accountId, context);
  if (!account) throw new NotFoundError("Account");
  if (account.type !== "cash") {
    throw new ValidationError(
      "Piggy banks live inside a cash account (checking, savings or similar)",
    );
  }
  return account;
}

/** The real balance of an account, from its ledger. */
export async function accountBalanceOf(accountId: string): Promise<number> {
  const ledger = await ledgerAccountsRepository.findByOwner("account", accountId);
  if (!ledger) throw new NotFoundError("Account ledger");
  return ledgerAccountsRepository.getBalance(ledger.id);
}

/** Money of the account that no piggy bank holds. */
export async function freeBalanceOf(accountId: string, householdContext: HouseholdContext) {
  const [balance, piggies] = await Promise.all([
    accountBalanceOf(accountId),
    piggyBanksRepository.listByHousehold(householdContext, {
      parentAccountId: accountId,
      includeArchived: true,
    }),
  ]);
  const balances = await piggyBanksRepository.balances(piggies.map((piggy) => piggy.id));
  const piggyTotal = [...balances.values()].reduce((sum, value) => sum + value, 0);
  return { balance, piggyTotal, free: balance - piggyTotal };
}

export const dayOf = (date: Date) => formatISODate(date);
