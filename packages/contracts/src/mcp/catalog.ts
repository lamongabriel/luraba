/**
 * The tools the MCP server exposes, grouped for the Settings > MCP page. The server's registry
 * (`apps/mcp/src/tools/registry.ts`) is the source of truth; a test in `apps/mcp` fails when the two differ.
 */
export const MCP_TOOL_GROUPS = [
  {
    id: "transactions",
    label: "Transactions",
    description: "Find, create, change and delete transactions, one at a time or in bulk.",
    tools: [
      "search_transactions",
      "get_transaction",
      "create_transaction",
      "update_transaction",
      "delete_transaction",
      "bulk_update_transactions",
      "bulk_categorize_transactions",
      "bulk_delete_transactions",
    ],
  },
  {
    id: "reference",
    label: "Accounts and reference data",
    description: "Accounts, credit cards, households, categories, merchants and tags.",
    tools: [
      "whoami",
      "list_households",
      "list_accounts",
      "list_credit_cards",
      "list_categories",
      "create_category",
      "update_category",
      "list_merchants",
      "create_merchant",
      "update_merchant",
      "list_tags",
      "create_tag",
      "update_tag",
    ],
  },
  {
    id: "reports",
    label: "Reports",
    description: "Spending, income, balances, credit card invoices, budgets and goals.",
    tools: [
      "report_spending",
      "report_income_expense",
      "report_balances",
      "report_credit_cards",
      "report_budget",
      "report_goals",
      "report_top_expenses",
    ],
  },
] as const;
