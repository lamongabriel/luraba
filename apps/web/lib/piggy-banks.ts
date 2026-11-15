import type { PiggyBankMovementKind } from "@luraba/contracts";

/** What each movement kind is called in the movements list. */
export const PIGGY_MOVEMENT_LABELS: Record<PiggyBankMovementKind, string> = {
  opening: "Starting balance",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer_in: "Moved in",
  transfer_out: "Moved out",
  interest: "Interest",
  adjustment: "Balance adjustment",
};
