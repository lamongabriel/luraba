import { ConflictError } from "@/shared/errors";

type Archivable = { name: string; archivedAt: Date | null };

/**
 * Archived accounts and credit cards keep their history but are closed to new activity. Call this
 * wherever a flow would post a new transaction, transfer, adjustment, purchase or payment against
 * an account or card; editing or deleting existing records stays allowed.
 */
export function assertNotArchived(target: Archivable, kind = "Account"): void {
  if (target.archivedAt) {
    throw new ConflictError(
      `${kind} "${target.name}" is archived. Unarchive it before adding new transactions.`,
    );
  }
}
