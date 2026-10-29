import { createS3Storage, type StorageProvider } from "@luraba/storage";
import { env } from "@/config/env";
import { DependencyUnavailableError } from "@/shared/errors";

let override: StorageProvider | undefined;
let configured: StorageProvider | undefined;

export function isStorageEnabled(): boolean {
  return override !== undefined || env.storage !== undefined;
}

/** The bucket client, created on first use. Throws a 503 when no bucket is configured. */
export function getStorage(): StorageProvider {
  if (override) return override;

  if (!env.storage) {
    throw new DependencyUnavailableError(
      "File storage is not configured. Set the STORAGE_* variables to enable uploads.",
    );
  }

  configured ??= createS3Storage(env.storage);
  return configured;
}

/** Tests swap in an in-memory store; pass undefined to restore the configured one. */
export function setStorageForTesting(storage: StorageProvider | undefined): void {
  override = storage;
}
