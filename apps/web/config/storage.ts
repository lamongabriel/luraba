import { z } from "zod"

import type { StorageDefinition } from "@/lib/local-storage"

function defineStorage<T>(definition: StorageDefinition<T>) {
  return definition
}

export const STORAGE_KEYS = {
  activeHouseholdId: defineStorage<string>({
    key: "luraba.active-household-id",
    fallback: "",
    schema: z.string().min(1),
  }),
} as const
