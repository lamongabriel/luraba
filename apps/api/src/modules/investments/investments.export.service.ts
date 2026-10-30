import { d } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { toCsv, toJson } from "@/modules/exports/exports.format";
import type { ExportTable } from "@/modules/exports/exports.types";
import * as reports from "./investments.reports.service";
import * as repo from "./investments.repository";
import { computeHoldings, resolveScope } from "./investments.valuation";

export type InvestmentExportKind =
  | "events"
  | "positions"
  | "income"
  | "realized"
  | "tax"
  | "backup";
type Row = Record<string, string | number | boolean | null>;

const table = (columns: string[], records: Row[]): ExportTable => ({ columns, records });

/** Minor units to a plain decimal string (1234 BRL cents -> "12.34"). */
async function money(
  scope: Awaited<ReturnType<typeof resolveScope>>,
  minor: number,
  currency?: string,
): Promise<string> {
  const code = currency ?? scope.reportingCurrency;
  return (await scope.fx.major(minor, code)).toFixed();
}

async function eventsTable(context: HouseholdContext, accountId?: string): Promise<ExportTable> {
  const scope = await resolveScope(context, { accountId });
  const events = await repo.eventsRepository.listForEngine(
    context,
    scope.accounts.map((a) => a.id),
  );
  const assets = new Map(
    (
      await repo.findAssets(context, [
        ...new Set(events.map((e) => e.assetId).filter((x): x is string => !!x)),
      ])
    ).map((a) => [a.id, a]),
  );
  const accounts = new Map(scope.accounts.map((a) => [a.id, a.name]));
  return table(
    [
      "date",
      "type",
      "symbol",
      "quantity",
      "unit_price",
      "gross_amount",
      "fees",
      "taxes_withheld",
      "currency",
      "notes",
      "external_id",
      "account",
    ],
    events.map((e) => ({
      date: e.tradeDate,
      type: e.type,
      symbol: e.assetId ? (assets.get(e.assetId)?.symbol ?? null) : null,
      quantity: e.quantity ? d(e.quantity).toFixed() : null,
      unit_price: e.unitPrice ? d(e.unitPrice).toFixed() : null,
      gross_amount: d(e.grossAmount).toFixed(),
      fees: d(e.fees).toFixed(),
      taxes_withheld: d(e.taxesWithheld).toFixed(),
      currency: e.currencyId,
      notes: e.notes,
      external_id: e.externalId ?? e.id,
      account: accounts.get(e.accountId) ?? null,
    })),
  );
}

export async function buildInvestmentExport(
  context: HouseholdContext,
  kind: InvestmentExportKind,
  options: { format: "csv" | "json"; accountId?: string; year?: number },
): Promise<{ fileName: string; contentType: string; body: string }> {
  const scope = await resolveScope(context, { accountId: options.accountId });
  let tables: Record<string, ExportTable>;

  switch (kind) {
    case "events":
      tables = { events: await eventsTable(context, options.accountId) };
      break;
    case "positions": {
      const positions = await reports.listPositions(context, { accountId: options.accountId });
      tables = {
        positions: table(
          [
            "symbol",
            "name",
            "class",
            "currency",
            "quantity",
            "average_cost",
            "price",
            "invested",
            "market_value",
            "net_value",
            "unrealized_pnl",
            "realized_pnl",
            "income",
            "reporting_currency",
          ],
          await Promise.all(
            positions.map(async (p) => ({
              symbol: p.symbol,
              name: p.name,
              class: p.assetClass,
              currency: p.currencyCode,
              quantity: p.quantity,
              average_cost: p.averageCost,
              price: p.price?.price ?? null,
              invested: await money(scope, p.invested),
              market_value: await money(scope, p.marketValue),
              net_value: await money(scope, p.netValue),
              unrealized_pnl: await money(scope, p.unrealizedPnl),
              realized_pnl: await money(scope, p.realizedPnl),
              income: await money(scope, p.income),
              reporting_currency: scope.reportingCurrency,
            })),
          ),
        ),
      };
      break;
    }
    case "income": {
      const report = await reports.income(context, { accountId: options.accountId });
      tables = {
        income: table(
          ["date", "symbol", "type", "gross", "withheld", "net", "currency"],
          await Promise.all(
            report.rows.map(async (r) => ({
              date: r.date,
              symbol: r.symbol,
              type: r.type,
              gross: await money(scope, r.gross),
              withheld: await money(scope, r.withheld),
              net: await money(scope, r.net),
              currency: report.reportingCurrencyCode,
            })),
          ),
        ),
      };
      break;
    }
    case "realized": {
      const holdings = await computeHoldings(scope);
      const rows: Row[] = [];
      for (const { ledger } of holdings.ledgers) {
        for (const s of ledger.sales) {
          if (options.year && !s.date.startsWith(String(options.year))) continue;
          rows.push({
            date: s.date,
            symbol: holdings.assets.get(s.assetId)?.symbol ?? null,
            quantity: s.quantity.toFixed(),
            gross: s.grossAsset.toFixed(),
            proceeds: s.proceedsAsset.toFixed(),
            cost: s.costAsset.toFixed(),
            pnl: s.pnlAsset.toFixed(),
            category: s.category,
            currency: s.currency,
          });
        }
      }
      tables = {
        realized: table(
          [
            "date",
            "symbol",
            "quantity",
            "gross",
            "proceeds",
            "cost",
            "pnl",
            "category",
            "currency",
          ],
          rows,
        ),
      };
      break;
    }
    case "tax": {
      const year = options.year ?? new Date().getUTCFullYear();
      const report = await reports.taxes(context, { year, accountId: options.accountId });
      const brl = async (v: number) => (await scope.fx.major(v, "BRL")).toFixed();
      tables = {
        apuracao: table(
          [
            "month",
            "bucket",
            "sales_total",
            "result",
            "exempt_gain",
            "loss_used",
            "taxable_base",
            "rate_percent",
            "tax_due",
            "darf_code",
            "due_date",
            "paid",
          ],
          await Promise.all(
            report.apuracao.map(async (l) => ({
              month: l.month,
              bucket: l.bucket,
              sales_total: await brl(l.salesTotal),
              result: await brl(l.result),
              exempt_gain: await brl(l.exemptGain),
              loss_used: await brl(l.lossUsed),
              taxable_base: await brl(l.taxableBase),
              rate_percent: l.ratePercent,
              tax_due: await brl(l.taxDue),
              darf_code: l.darfCode,
              due_date: l.dueDate,
              paid: l.paid,
            })),
          ),
        ),
        us_gains: table(
          [
            "symbol",
            "sale_date",
            "acquired_date",
            "quantity",
            "proceeds",
            "cost",
            "gain",
            "term",
            "estimated_tax",
            "currency",
          ],
          await Promise.all(
            report.usGains.map(async (g) => ({
              symbol: g.symbol,
              sale_date: g.saleDate,
              acquired_date: g.acquiredDate,
              quantity: g.quantity,
              proceeds: await money(scope, g.proceeds, g.currencyCode),
              cost: await money(scope, g.cost, g.currencyCode),
              gain: await money(scope, g.gain, g.currencyCode),
              term: g.term,
              estimated_tax: await money(scope, g.estimatedTax, g.currencyCode),
              currency: g.currencyCode,
            })),
          ),
        ),
        holdings_at_cost: table(
          ["symbol", "name", "class", "quantity", "cost_brl"],
          await Promise.all(
            report.annual.holdingsAtCost.map(async (h) => ({
              symbol: h.symbol,
              name: h.name,
              class: h.assetClass,
              quantity: h.quantity,
              cost_brl: await brl(h.cost),
            })),
          ),
        ),
      };
      break;
    }
    default: {
      // backup: everything needed to rebuild the ledger, in the shape the JSON importer reads.
      const events = await eventsTable(context, options.accountId);
      const full = (
        await repo.eventsRepository.listForEngine(
          context,
          scope.accounts.map((a) => a.id),
        )
      ).map((e, i) => ({
        ...events.records[i],
        tradeDate: e.tradeDate,
        meta: e.meta,
      }));
      return {
        fileName: "investments-backup.json",
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            accounts: scope.accounts.map((a) => ({
              name: a.name,
              currency: a.currencyId,
              ...a.settings,
            })),
            events: full,
          },
          null,
          2,
        ),
      };
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  if (options.format === "json") {
    return {
      fileName: `investments-${kind}-${stamp}.json`,
      contentType: "application/json; charset=utf-8",
      body: toJson(tables),
    };
  }
  const first = Object.values(tables);
  const body =
    first.length === 1
      ? toCsv(first[0] as ExportTable)
      : first.map((t, i) => `# ${Object.keys(tables)[i]}\r\n${toCsv(t)}`).join("\r\n");
  return {
    fileName: `investments-${kind}-${stamp}.csv`,
    contentType: "text/csv; charset=utf-8",
    body,
  };
}
