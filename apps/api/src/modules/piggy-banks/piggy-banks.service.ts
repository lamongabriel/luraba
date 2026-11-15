import type {
  CreatePiggyBankInput,
  PiggyBank,
  PiggyBankDetail,
  PiggyBankMovement,
  PiggyBanksOverview,
  PiggyBanksReport,
  UpdatePiggyBankInput,
} from "@luraba/contracts/piggy-banks";
import {
  buildProjectionSeries,
  formatISODate,
  formatISODateTime,
  getTodayInTimezone,
  netIfWithdrawn,
  openLots,
  parseISODate,
  projectWithYield,
  startOfMonth,
} from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { loadTaxRules } from "@/modules/investments/investments.macro";
import { assertHouseholdImageUpload } from "@/modules/uploads/uploads.guards";
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { annualRatesOf, loadGoalLinksForPiggyBanks } from "./piggy-banks.goals.service";
import { piggyBanksRepository } from "./piggy-banks.repository";
import {
  accountBalanceOf,
  freeBalanceOf,
  normalizeYield,
  type PiggyWithParent,
  requireParentAccount,
  requirePiggyBank,
  yieldLabelOf,
} from "./piggy-banks.shared";
import { FLOW_KINDS, type PiggyBankMovementRecord, PRINCIPAL_KINDS } from "./piggy-banks.types";

const todayOf = (context: HouseholdContext) => getTodayInTimezone(context.timezone);

function mapYield(piggy: PiggyWithParent): PiggyBank["yield"] {
  return {
    type: piggy.yieldType as PiggyBank["yield"]["type"],
    rate: Number(piggy.yieldRate),
    dayCount: piggy.dayCount === 252 ? 252 : 365,
    maturityDate: piggy.maturityDate ? formatISODate(piggy.maturityDate) : null,
    liquidity: piggy.liquidity as PiggyBank["yield"]["liquidity"],
    taxRegime: piggy.taxRegime as PiggyBank["yield"]["taxRegime"],
    applyIof: piggy.applyIof,
    label: yieldLabelOf(piggy),
  };
}

function mapSummary(
  piggy: PiggyWithParent,
  extras: { balance: number; monthEarnings: number; goals: PiggyBank["goals"] },
): PiggyBank {
  return {
    id: piggy.id,
    parentAccountId: piggy.parentAccountId,
    parentAccountName: piggy.parentAccountName,
    title: piggy.title,
    description: piggy.description,
    coverUploadId: piggy.coverUploadId,
    coverPreset: piggy.coverPreset as PiggyBank["coverPreset"],
    emoji: piggy.emoji,
    color: piggy.color,
    currencyCode: piggy.currencyCode,
    yield: mapYield(piggy),
    isUnallocated: piggy.isUnallocated,
    balance: extras.balance,
    monthEarnings: extras.monthEarnings,
    accruedThrough: piggy.accruedThrough ? formatISODate(piggy.accruedThrough) : null,
    goals: extras.goals,
    archivedAt: piggy.archivedAt ? formatISODateTime(piggy.archivedAt) : null,
    createdByUserId: piggy.createdByUserId,
    createdAt: formatISODateTime(piggy.createdAt),
    updatedAt: formatISODateTime(piggy.updatedAt),
  };
}

async function buildSummaries(
  context: HouseholdContext,
  piggies: readonly PiggyWithParent[],
): Promise<PiggyBank[]> {
  const ids = piggies.map((piggy) => piggy.id);
  const today = todayOf(context);
  const [balances, month, goalLinks] = await Promise.all([
    piggyBanksRepository.balances(ids),
    piggyBanksRepository.sumByKinds(ids, ["interest"], { from: startOfMonth(today), to: today }),
    loadGoalLinksForPiggyBanks(context, ids),
  ]);
  return piggies.map((piggy) =>
    mapSummary(piggy, {
      balance: balances.get(piggy.id) ?? 0,
      monthEarnings: month.get(piggy.id) ?? 0,
      goals: goalLinks.get(piggy.id) ?? [],
    }),
  );
}

async function loadWithParent(context: HouseholdContext, id: string): Promise<PiggyWithParent> {
  const [piggy] = await piggyBanksRepository.listByHousehold(context, {
    piggyBankIds: [id],
    includeArchived: true,
  });
  if (!piggy) throw new NotFoundError("Piggy bank");
  return piggy;
}

/** One piggy bank with everything the detail page shows. */
export async function presentDetail(
  context: HouseholdContext,
  id: string,
): Promise<PiggyBankDetail> {
  const piggy = await loadWithParent(context, id);
  const [summary] = await buildSummaries(context, [piggy]);
  if (!summary) throw new NotFoundError("Piggy bank");
  const today = todayOf(context);
  const todayIso = formatISODate(today);

  const [todaySum, monthSum, allTime, movements, rules, rates] = await Promise.all([
    piggyBanksRepository.sumByKinds([id], ["interest"], { from: today, to: today }),
    piggyBanksRepository.sumByKinds([id], ["interest"], { from: startOfMonth(today), to: today }),
    piggyBanksRepository.sumByKinds([id], ["interest"]),
    piggyBanksRepository.principalMovements(id, PRINCIPAL_KINDS),
    loadTaxRules(),
    annualRatesOf([piggy], today),
  ]);

  const lots = openLots(
    movements.map((movement) => ({
      kind: movement.kind as "deposit",
      date: formatISODate(movement.occurredOn),
      amount: movement.amount,
    })),
  );
  const net = netIfWithdrawn({
    grossBalance: summary.balance,
    lots,
    today: todayIso,
    rules,
    taxRegime: piggy.taxRegime === "regressive_ir" ? "regressive_ir" : "none",
    applyIof: piggy.applyIof,
  });

  // Average of the three full months before this one.
  const firstOfThisMonth = startOfMonth(today);
  const threeBack = new Date(
    Date.UTC(firstOfThisMonth.getUTCFullYear(), firstOfThisMonth.getUTCMonth() - 3, 1),
  );
  const flows = await piggyBanksRepository.monthlyFlows([id], FLOW_KINDS, threeBack);
  const thisMonthKey = todayIso.slice(0, 7);
  const averageMonthlyDeposit = Math.max(
    0,
    Math.round(
      flows
        .filter((flow) => flow.month !== thisMonthKey)
        .reduce((sum, flow) => sum + flow.total, 0) / 3,
    ),
  );
  const annualRate = rates.get(id) ?? 0;

  return {
    ...summary,
    gross: summary.balance,
    netIfWithdrawn: net,
    earnings: {
      today: todaySum.get(id) ?? 0,
      month: monthSum.get(id) ?? 0,
      allTime: allTime.get(id) ?? 0,
    },
    annualRate,
    averageMonthlyDeposit,
    projection: buildProjectionSeries({
      startMonth: `${todayIso.slice(0, 7)}-01`,
      start: summary.balance,
      monthly: averageMonthlyDeposit,
      annualRate,
      months: 12,
      target: 0,
    }),
  };
}

export async function listPiggyBanks(
  context: HouseholdContext,
  query: { parentAccountId?: string; goalId?: string; includeArchived?: boolean },
): Promise<PiggyBanksOverview> {
  const all = await piggyBanksRepository.listByHousehold(context, { includeArchived: true });
  let visible = all.filter((piggy) => (query.includeArchived ? true : !piggy.archivedAt));
  if (query.parentAccountId) {
    visible = visible.filter((piggy) => piggy.parentAccountId === query.parentAccountId);
  }
  if (query.goalId) {
    const links = await piggyBanksRepository.goalLinks([query.goalId]);
    const ids = new Set(links.map((link) => link.piggyBankId));
    visible = visible.filter((piggy) => ids.has(piggy.id));
  }

  const balances = await piggyBanksRepository.balances(all.map((piggy) => piggy.id));
  const parents = new Map<string, PiggyWithParent>();
  for (const piggy of all) parents.set(piggy.parentAccountId, piggy);
  const accounts = [];
  for (const [accountId, sample] of parents) {
    if (query.parentAccountId && accountId !== query.parentAccountId) continue;
    const piggyTotal = all
      .filter((piggy) => piggy.parentAccountId === accountId)
      .reduce((sum, piggy) => sum + (balances.get(piggy.id) ?? 0), 0);
    const balance = await accountBalanceOf(accountId);
    accounts.push({
      accountId,
      name: sample.parentAccountName,
      currencyCode: sample.currencyCode,
      balance,
      free: balance - piggyTotal,
      piggyTotal,
      piggyBankCount: all.filter(
        (piggy) => piggy.parentAccountId === accountId && !piggy.archivedAt,
      ).length,
    });
  }
  accounts.sort((a, b) => a.name.localeCompare(b.name));

  return { accounts, piggyBanks: await buildSummaries(context, visible) };
}

export async function getPiggyBank(context: HouseholdContext, id: string) {
  return presentDetail(context, id);
}

async function assertCover(context: HouseholdContext, uploadId: string | null | undefined) {
  if (uploadId) await assertHouseholdImageUpload(context, uploadId, "coverUploadId");
}

export async function createPiggyBank(
  context: HouseholdContext,
  body: CreatePiggyBankInput,
): Promise<PiggyBankDetail> {
  const parent = await requireParentAccount(context, body.parentAccountId);
  if (parent.archivedAt) {
    throw new ConflictError(`Account "${parent.name}" is archived. Unarchive it first.`);
  }
  await assertCover(context, body.coverUploadId);
  if (body.initialBalance) {
    const { free } = await freeBalanceOf(parent.id, context);
    if (body.initialBalance > free) {
      throw new ValidationError("The starting balance is more than the account's free balance");
    }
  }

  const today = todayOf(context);
  let created: Awaited<ReturnType<typeof piggyBanksRepository.create>>;
  try {
    created = await piggyBanksRepository.create(context, {
      parentAccountId: parent.id,
      title: body.title,
      description: body.description ?? null,
      coverUploadId: body.coverUploadId ?? null,
      coverPreset: body.coverPreset ?? null,
      emoji: body.emoji ?? null,
      color: body.color ?? null,
      currencyCode: parent.currencyId,
      createdByUserId: context.userId,
      ...normalizeYield(body.yield),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("This account already has a piggy bank with that title");
    }
    throw error;
  }
  if (body.initialBalance) {
    await piggyBanksRepository.insertMovements(db, [
      {
        piggyBankId: created.id,
        kind: "opening",
        amount: body.initialBalance,
        occurredOn: today,
        createdByUserId: context.userId,
      },
    ]);
  }
  return presentDetail(context, created.id);
}

export async function updatePiggyBank(
  context: HouseholdContext,
  id: string,
  body: UpdatePiggyBankInput,
): Promise<PiggyBankDetail> {
  const piggy = await requirePiggyBank(context, id);
  await assertCover(context, body.coverUploadId);
  const { yield: yieldInput, ...rest } = body;
  try {
    const updated = await piggyBanksRepository.update(id, context, {
      ...(rest.title === undefined ? {} : { title: rest.title }),
      ...(rest.description === undefined ? {} : { description: rest.description }),
      ...(rest.coverUploadId === undefined ? {} : { coverUploadId: rest.coverUploadId }),
      ...(rest.coverPreset === undefined ? {} : { coverPreset: rest.coverPreset }),
      ...(rest.emoji === undefined ? {} : { emoji: rest.emoji }),
      ...(rest.color === undefined ? {} : { color: rest.color }),
      ...(yieldInput ? normalizeYield(yieldInput) : {}),
    });
    if (!updated) throw new NotFoundError("Piggy bank");
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("This account already has a piggy bank with that title");
    }
    throw error;
  }
  void piggy;
  return presentDetail(context, id);
}

/** Only an empty piggy bank can be archived; unarchive restores it as it was. */
export async function archivePiggyBank(context: HouseholdContext, id: string) {
  const piggy = await requirePiggyBank(context, id);
  if (!piggy.archivedAt) {
    const balance = (await piggyBanksRepository.balances([id])).get(id) ?? 0;
    if (balance !== 0) {
      throw new ConflictError(
        "Only an empty piggy bank can be archived. Move or withdraw its balance first.",
      );
    }
    await piggyBanksRepository.setArchivedAt(context, id, new Date());
  }
  return presentDetail(context, id);
}

export async function unarchivePiggyBank(context: HouseholdContext, id: string) {
  const piggy = await requirePiggyBank(context, id);
  if (piggy.archivedAt) await piggyBanksRepository.setArchivedAt(context, id, null);
  return presentDetail(context, id);
}

function mapMovement(
  row: PiggyBankMovementRecord & { counterpartTitle: string | null },
): PiggyBankMovement {
  return {
    id: row.id,
    kind: row.kind as PiggyBankMovement["kind"],
    amount: row.amount,
    occurredOn: formatISODate(row.occurredOn),
    estimated: row.estimated,
    note: row.note,
    transactionId: row.transactionId,
    groupId: row.groupId,
    counterpart:
      row.counterpartPiggyBankId && row.counterpartTitle
        ? { id: row.counterpartPiggyBankId, title: row.counterpartTitle }
        : null,
    createdAt: formatISODateTime(row.createdAt),
  };
}

export async function listMovements(
  context: HouseholdContext,
  id: string,
  query: { page: number; perPage: number; kind?: string },
): Promise<ListResult<PiggyBankMovement>> {
  await requirePiggyBank(context, id);
  const page = await piggyBanksRepository.listMovements(id, {
    kind: query.kind,
    limit: query.perPage,
    offset: (query.page - 1) * query.perPage,
  });
  return {
    data: page.rows.map(mapMovement),
    meta: createListMeta(query, page.total),
  };
}

/** Balances, earnings and a twelve-month projection of every active piggy bank. */
export async function reportPiggyBanks(
  context: HouseholdContext,
  month: string | undefined,
): Promise<PiggyBanksReport> {
  const today = todayOf(context);
  const key = month ?? formatISODate(today).slice(0, 7);
  const first = parseISODate(`${key}-01`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const piggies = await piggyBanksRepository.listByHousehold(context, {});
  const ids = piggies.map((piggy) => piggy.id);
  const [balances, monthSums, allTime, rates, rules] = await Promise.all([
    piggyBanksRepository.balances(ids),
    piggyBanksRepository.sumByKinds(ids, ["interest"], { from: first, to: last }),
    piggyBanksRepository.sumByKinds(ids, ["interest"]),
    annualRatesOf(piggies, today),
    loadTaxRules(),
  ]);

  const rows: PiggyBanksReport["piggyBanks"] = [];
  for (const piggy of piggies) {
    const balance = balances.get(piggy.id) ?? 0;
    const annualRate = rates.get(piggy.id) ?? 0;
    const movements = await piggyBanksRepository.principalMovements(piggy.id, PRINCIPAL_KINDS);
    const net = netIfWithdrawn({
      grossBalance: balance,
      lots: openLots(
        movements.map((movement) => ({
          kind: movement.kind as "deposit",
          date: formatISODate(movement.occurredOn),
          amount: movement.amount,
        })),
      ),
      today: formatISODate(today),
      rules,
      taxRegime: piggy.taxRegime === "regressive_ir" ? "regressive_ir" : "none",
      applyIof: piggy.applyIof,
    });
    rows.push({
      id: piggy.id,
      title: piggy.title,
      parentAccountName: piggy.parentAccountName,
      currencyCode: piggy.currencyCode,
      yieldLabel: yieldLabelOf(piggy),
      balance,
      netIfWithdrawn: net.net,
      earningsMonth: monthSums.get(piggy.id) ?? 0,
      earningsAllTime: allTime.get(piggy.id) ?? 0,
      annualRate,
      projectedIn12Months:
        projectWithYield({ start: balance, monthly: 0, annualRate, months: 12 })[12] ?? balance,
    });
  }

  const totals = new Map<string, PiggyBanksReport["totals"][number]>();
  for (const row of rows) {
    const total = totals.get(row.currencyCode) ?? {
      currencyCode: row.currencyCode,
      balance: 0,
      earningsMonth: 0,
      earningsAllTime: 0,
    };
    total.balance += row.balance;
    total.earningsMonth += row.earningsMonth;
    total.earningsAllTime += row.earningsAllTime;
    totals.set(row.currencyCode, total);
  }
  return { month: key, piggyBanks: rows, totals: [...totals.values()] };
}
