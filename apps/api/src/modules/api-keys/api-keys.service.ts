import type { ApiKey, ApiKeyStatus, CreatedApiKey } from "@luraba/contracts";
import type { CreateApiKeyInput, UpdateApiKeyInput } from "@luraba/contracts/api-keys";
import { formatISODateTime } from "@luraba/domain";
import { NotFoundError } from "@/shared/errors";
import { auth } from "@/shared/lib/auth";
import { apiKeysRepository, type PublicApiKeyRecord } from "./api-keys.repository";

const SECONDS_PER_DAY = 24 * 60 * 60;

function statusOf(record: PublicApiKeyRecord): ApiKeyStatus {
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return "expired";
  return record.enabled ? "active" : "disabled";
}

function toWire(record: PublicApiKeyRecord): ApiKey {
  return {
    id: record.id,
    name: record.name ?? "Untitled key",
    prefix: record.start ?? "",
    enabled: record.enabled,
    status: statusOf(record),
    expiresAt: record.expiresAt ? formatISODateTime(record.expiresAt) : null,
    lastUsedAt: record.lastRequest ? formatISODateTime(record.lastRequest) : null,
    createdAt: formatISODateTime(record.createdAt),
  };
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const records = await apiKeysRepository.listForUser(userId);
  return records.map(toWire);
}

/** Creates the key through Better Auth (generation + hashing) and returns the secret exactly once. */
export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput,
): Promise<CreatedApiKey> {
  const created = await auth.api.createApiKey({
    body: {
      userId,
      name: input.name,
      ...(input.expiresInDays ? { expiresIn: input.expiresInDays * SECONDS_PER_DAY } : {}),
    },
  });

  const record = await apiKeysRepository.findForUser(userId, created.id);
  if (!record) throw new NotFoundError("API key");
  return { ...toWire(record), secret: created.key };
}

export async function updateApiKey(
  userId: string,
  id: string,
  input: UpdateApiKeyInput,
): Promise<ApiKey> {
  const record = await apiKeysRepository.update(userId, id, {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
  });
  if (!record) throw new NotFoundError("API key");
  return toWire(record);
}

export async function deleteApiKey(userId: string, id: string): Promise<void> {
  const deleted = await apiKeysRepository.delete(userId, id);
  if (!deleted) throw new NotFoundError("API key");
}
