import type { CorporateActionSuggestion } from "@luraba/contracts/investments";
import { addIsoDays, d, ZERO } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { marketDataService } from "@/modules/market-data/market-data.service";
import { logger } from "@/shared/logger";
import * as repo from "./investments.repository";
import { resolveScope, runAccountLedger, todayIso } from "./investments.valuation";

const INCOME_TYPES = ["DIVIDEND", "JCP", "FII_INCOME"];

/**
 * Splits and dividends the market-data providers report for assets the household holds. They are
 * suggestions only: nothing is recorded until the user confirms (it then creates a normal event).
 */
export async function listCorporateActions(
  context: HouseholdContext,
  query: { accountId?: string; assetId?: string; from?: string },
): Promise<CorporateActionSuggestion[]> {
  const scope = await resolveScope(context, { accountId: query.accountId });
  const events = await repo.eventsRepository.listForEngine(
    context,
    scope.accounts.map((a) => a.id),
  );
  const assetIds = [
    ...new Set(events.map((e) => e.assetId).filter((x): x is string => !!x)),
  ].filter((id) => !query.assetId || id === query.assetId);
  const assets = await repo.findAssets(context, assetIds);
  const today = todayIso();
  const out: CorporateActionSuggestion[] = [];

  for (const asset of assets) {
    const first = events
      .filter((e) => e.assetId === asset.id)
      .reduce((min, e) => (e.tradeDate < min ? e.tradeDate : min), today);
    const from = query.from ?? first;
    let actions: Awaited<ReturnType<typeof marketDataService.suggestedCorporateActions>>;
    try {
      actions = await marketDataService.suggestedCorporateActions(
        context.householdId,
        asset,
        from,
        today,
      );
    } catch (err) {
      logger.debug({ err, symbol: asset.symbol }, "[investments] No corporate actions available");
      continue;
    }
    for (const account of scope.accounts) {
      const accountEvents = events.filter((e) => e.accountId === account.id);
      const ofAsset = accountEvents.filter((e) => e.assetId === asset.id);
      if (ofAsset.length === 0) continue;
      const dates = [
        ...actions.splits.map((s) => s.date),
        ...actions.dividends.map((x) => x.exDate),
      ]
        .filter((x) => x >= from)
        .sort();
      const result = runAccountLedger(account, accountEvents, {
        checkpoints: [...new Set(dates.map((x) => addIsoDays(x, -1)))],
      });
      const heldOn = (date: string) => {
        const snap = [...result.snapshots].reverse().find((s) => s.date <= addIsoDays(date, -1));
        return snap?.positions.find((p) => p.assetId === asset.id)?.quantity ?? ZERO;
      };

      for (const split of actions.splits) {
        const qty = heldOn(split.date);
        if (qty.lte(0) || split.date < first) continue;
        const ratioTo = d(split.numerator);
        const ratioFrom = d(split.denominator);
        const reverse = ratioTo.lt(ratioFrom);
        out.push({
          assetId: asset.id,
          accountId: account.id,
          symbol: asset.symbol,
          kind: reverse ? "REVERSE_SPLIT" : "SPLIT",
          date: split.date,
          paymentDate: null,
          ratioFrom: ratioFrom.toFixed(),
          ratioTo: ratioTo.toFixed(),
          amountPerShare: null,
          quantityHeld: qty.toFixed(),
          suggestedGross: null,
          currencyCode: asset.currencyId,
          alreadyRecorded: ofAsset.some(
            (e) =>
              (e.type === "SPLIT" || e.type === "REVERSE_SPLIT") &&
              Math.abs(Date.parse(e.tradeDate) - Date.parse(split.date)) <= 3 * 86_400_000,
          ),
          provider: "market-data",
        });
      }
      for (const dividend of actions.dividends) {
        const qty = heldOn(dividend.exDate);
        if (qty.lte(0)) continue;
        out.push({
          assetId: asset.id,
          accountId: account.id,
          symbol: asset.symbol,
          kind: "DIVIDEND",
          date: dividend.exDate,
          paymentDate: dividend.paymentDate,
          ratioFrom: null,
          ratioTo: null,
          amountPerShare: d(dividend.amount).toFixed(),
          quantityHeld: qty.toFixed(),
          suggestedGross: qty.mul(dividend.amount).toDecimalPlaces(2).toFixed(),
          currencyCode: dividend.currency ?? asset.currencyId,
          alreadyRecorded: ofAsset.some(
            (e) =>
              INCOME_TYPES.includes(e.type) &&
              e.tradeDate >= dividend.exDate &&
              e.tradeDate <= addIsoDays(dividend.exDate, 45),
          ),
          provider: "market-data",
        });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
