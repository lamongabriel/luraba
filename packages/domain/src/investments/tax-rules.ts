import { diffIsoDays } from "./calendar.js";
import { type Dec, d } from "./decimal.js";
import type { IsoDate } from "./types.js";

/**
 * Tax rules are data: versioned rows with an effective period. The engine only reads them through
 * `TaxRules`; nothing in code hardcodes a rate. Defaults live in `tax-seed.ts` and are inserted by
 * migration `0043`. Every seeded value needs verification against current legislation
 * (docs/investments/DECISIONS.md).
 */
export type TaxRuleRow = {
  country: string;
  ruleKey: string;
  assetClass?: string | null;
  eventType?: string | null;
  rate?: string | null;
  minDays?: number | null;
  maxDays?: number | null;
  threshold?: string | null;
  params?: Record<string, unknown> | null;
  effectiveFrom: IsoDate;
  effectiveTo?: IsoDate | null;
  notes?: string | null;
};

export type TaxRuleFilter = {
  assetClass?: string;
  eventType?: string;
  days?: number;
  bucket?: string;
};

export class TaxRules {
  constructor(readonly rows: readonly TaxRuleRow[]) {}

  /** Rows of `ruleKey` in force on `date`, narrowed by class/event/holding days/bucket. */
  find(ruleKey: string, date: IsoDate, filter: TaxRuleFilter = {}): TaxRuleRow[] {
    return this.rows.filter((row) => {
      if (row.ruleKey !== ruleKey) return false;
      if (row.effectiveFrom > date) return false;
      if (row.effectiveTo && row.effectiveTo < date) return false;
      if (
        row.assetClass &&
        filter.assetClass !== undefined &&
        row.assetClass !== filter.assetClass
      ) {
        return false;
      }
      if (row.assetClass && filter.assetClass === undefined) return false;
      if (row.eventType && filter.eventType !== undefined && row.eventType !== filter.eventType) {
        return false;
      }
      if (filter.days !== undefined) {
        if (row.minDays !== null && row.minDays !== undefined && filter.days < row.minDays)
          return false;
        if (row.maxDays !== null && row.maxDays !== undefined && filter.days > row.maxDays)
          return false;
      }
      if (
        filter.bucket !== undefined &&
        row.params?.bucket !== undefined &&
        row.params.bucket !== filter.bucket
      ) {
        return false;
      }
      return true;
    });
  }

  first(ruleKey: string, date: IsoDate, filter: TaxRuleFilter = {}): TaxRuleRow | undefined {
    return this.find(ruleKey, date, filter)[0];
  }

  rate(ruleKey: string, date: IsoDate, filter: TaxRuleFilter = {}): Dec {
    return d(this.first(ruleKey, date, filter)?.rate);
  }

  threshold(ruleKey: string, date: IsoDate, filter: TaxRuleFilter = {}): Dec {
    return d(this.first(ruleKey, date, filter)?.threshold);
  }

  has(ruleKey: string, date: IsoDate, filter: TaxRuleFilter = {}): boolean {
    return this.first(ruleKey, date, filter) !== undefined;
  }
}

export function holdingDays(from: IsoDate, to: IsoDate): number {
  return diffIsoDays(from, to);
}
