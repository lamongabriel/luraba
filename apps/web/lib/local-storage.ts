import type { ZodType } from "zod"

export type StorageDefinition<T> = {
  fallback: T
  key: string
  schema?: ZodType<T>
  validate?: (value: unknown) => value is T
}

function isValidStorageValue<T>(
  definition: StorageDefinition<T>,
  value: unknown,
): value is T {
  if (definition.schema) {
    return definition.schema.safeParse(value).success
  }

  if (definition.validate) {
    return definition.validate(value)
  }

  return true
}

function getStorage() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readStorage<T>(definition: StorageDefinition<T>): T {
  const storage = getStorage()

  if (!storage) {
    return definition.fallback
  }

  try {
    const rawValue = storage.getItem(definition.key)

    if (rawValue === null) {
      return definition.fallback
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (!isValidStorageValue(definition, parsedValue)) {
      storage.removeItem(definition.key)
      return definition.fallback
    }

    return (parsedValue as T) ?? definition.fallback
  } catch {
    try {
      storage.removeItem(definition.key)
    } catch {
      // Ignore cleanup failures and use the fallback instead.
    }

    return definition.fallback
  }
}

export function writeStorage<T>(definition: StorageDefinition<T>, value: T) {
  const storage = getStorage()

  if (!storage) {
    return false
  }

  if (!isValidStorageValue(definition, value)) {
    return false
  }

  try {
    storage.setItem(definition.key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStorage(definition: StorageDefinition<unknown>) {
  const storage = getStorage()

  if (!storage) {
    return false
  }

  try {
    storage.removeItem(definition.key)
    return true
  } catch {
    return false
  }
}
