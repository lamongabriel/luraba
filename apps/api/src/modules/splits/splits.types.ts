import type {
  splitInstallmentsTable,
  splitParticipantsTable,
  splitsTable,
} from "@luraba/db/schemas/splits.schema";

export type SplitRecord = typeof splitsTable.$inferSelect;
export type ParticipantRecord = typeof splitParticipantsTable.$inferSelect;
export type InstallmentRecord = typeof splitInstallmentsTable.$inferSelect;
