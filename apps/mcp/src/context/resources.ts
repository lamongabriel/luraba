export type GuideResource = { uri: string; name: string; description: string; text: string };

export const guideResources: GuideResource[] = [
  {
    uri: "luraba://guide/overview",
    name: "Luraba overview for agents",
    description: "What Luraba is, how households work and which tool to use for common questions.",
    text: `# Luraba for agents

Luraba is a self-hosted personal-finance workspace. You act as the owner of the API key, inside one
household, with exactly that person's permissions.

## Common questions
- "How much do I owe on my cards this month?" -> report_credit_cards
- "How many credit cards do I have?" -> report_credit_cards (cardCount) or list_credit_cards
- "How much money do I have in <bank>?" -> report_balances with search
- "Where did my money go?" -> report_spending (groupBy category | merchant | tag)
- "Add this purchase" -> create_transaction (names are resolved; if ambiguous you get candidates back)
- "Set up an account or card" / "revalue my car" -> create_account, update_account (balance), create_credit_card; an empty household needs an account before any transaction
- "Recategorize / clean up many transactions" -> bulk_* tools with dryRun first

## Rules
- Amounts you send are in major units (12.50 means 12 dollars 50 cents) with a currency; amounts you read come back as
  { amount, currency, formatted }.
- Expenses are negative, income positive in summaries. Transfers move money between your own accounts.
- Destructive tools need confirm: true. Bulk tools support dryRun: true to preview.
- When a tool returns status needs_clarification, ask the user which candidate they meant, then call again with the exact name or id.
`,
  },
  {
    uri: "luraba://guide/transactions",
    name: "Creating and changing transactions",
    description: "Transaction kinds, installments, and how names are resolved.",
    text: `# Transactions

Kinds: income, expense, transfer (between two accounts) and credit card purchase (expense on a card, optionally in installments).
Names for accounts, cards, categories, merchants and tags are matched by id, exact name, then partial name. Unknown merchants,
categories and tags can be created on the fly with createMissing: true. Use dryRun: true to see what would be created before it is.
The transaction feed lists credit card purchases as one row per installment and hides future-dated rows.
`,
  },
];
