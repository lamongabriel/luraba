import type { HouseholdSummary } from "@/interfaces/household";

export type StorageDefinition<T> = {
  fallback: T;
  key: string;
  validate?: (value: unknown) => value is T;
};

function defineStorage<T>(definition: StorageDefinition<T>) {
  return definition;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isHouseholdSummary(value: unknown): value is HouseholdSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const household = value as Partial<HouseholdSummary>;

  return (
    typeof household.id === "string" &&
    typeof household.name === "string" &&
    typeof household.defaultCurrencyId === "string" &&
    typeof household.countryCode === "string" &&
    typeof household.timezone === "string" &&
    typeof household.role === "string"
  );
}

export const STORAGE_KEYS = {
  activeHouseholdId: defineStorage<string>({
    key: "luraba.active-household-id",
    fallback: "",
    validate: isNonEmptyString,
  }),
  households: defineStorage<HouseholdSummary[]>({
    key: "luraba.households",
    fallback: [],
    validate: (value): value is HouseholdSummary[] =>
      Array.isArray(value) && value.every(isHouseholdSummary),
  }),
} as const;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStorage<T>(definition: StorageDefinition<T>): T {
  const storage = getStorage();

  if (!storage) {
    return definition.fallback;
  }

  try {
    const rawValue = storage.getItem(definition.key);

    if (rawValue === null) {
      return definition.fallback;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (definition.validate && !definition.validate(parsedValue)) {
      storage.removeItem(definition.key);
      return definition.fallback;
    }

    return (parsedValue as T) ?? definition.fallback;
  } catch {
    try {
      storage.removeItem(definition.key);
    } catch {
      // Ignore cleanup failures and use the fallback instead.
    }

    return definition.fallback;
  }
}

export function writeStorage<T>(definition: StorageDefinition<T>, value: T) {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(definition.key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(definition: StorageDefinition<unknown>) {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(definition.key);
    return true;
  } catch {
    return false;
  }
}
