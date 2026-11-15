import { pool } from "../db";
import { adoptAccountEverywhere } from "../modules/piggy-banks/piggy-banks.adopt";

/**
 * pnpm --filter @luraba/api piggy:adopt -- [--household <id>] [--account "Nubank Caixinhas"] [--dry-run]
 * See docs/piggy-banks.md. Idempotent; prints one line per household.
 */
function readArgs(argv: string[]) {
  const args = {
    account: "Nubank Caixinhas",
    household: undefined as string | undefined,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--account") args.account = argv[++index] ?? args.account;
    else if (flag === "--household") args.household = argv[++index];
  }
  return args;
}

async function run() {
  const args = readArgs(process.argv.slice(2));
  try {
    const results = await adoptAccountEverywhere({
      accountName: args.account,
      householdId: args.household,
      dryRun: args.dryRun,
    });
    if (results.length === 0)
      console.log(`No account named "${args.account}" found. Nothing to do.`);
    for (const result of results) console.log(JSON.stringify(result));
  } finally {
    await pool.end();
  }
}

void run();
