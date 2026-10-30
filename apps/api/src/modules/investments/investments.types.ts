import type { accountsTable } from "@luraba/db/schemas/accounts.schema";
import type {
  assetFixedIncomeTermsTable,
  assetsTable,
  investmentAccountSettingsTable,
  investmentEventsTable,
  investmentPortfoliosTable,
  investmentSettingsTable,
} from "@luraba/db/schemas/investments.schema";

export type AccountRecord = typeof accountsTable.$inferSelect;
export type AssetRecord = typeof assetsTable.$inferSelect;
export type FixedIncomeTermsRecord = typeof assetFixedIncomeTermsTable.$inferSelect;
export type InvestmentEventRecord = typeof investmentEventsTable.$inferSelect;
export type PortfolioRecord = typeof investmentPortfoliosTable.$inferSelect;
export type InvestmentSettingsRecord = typeof investmentSettingsTable.$inferSelect;
export type AccountSettingsRecord = typeof investmentAccountSettingsTable.$inferSelect;

export type InvestmentAccountRecord = AccountRecord & { settings: AccountSettingsRecord };
