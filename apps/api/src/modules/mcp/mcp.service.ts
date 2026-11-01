import type { McpClient, McpConnection, McpServerInfo } from "@luraba/contracts";
import { formatISODateTime } from "@luraba/domain";
import { env } from "@/config/env";
import { NotFoundError } from "@/shared/errors";
import { mcpRepository } from "./mcp.repository";

const STATUS_TIMEOUT_MS = 2000;

/** The public origin of this deployment without a trailing slash (BASE_URL). */
export function publicOrigin(): string {
  return env.baseUrl.replace(/\/+$/u, "");
}

export function mcpPublicUrl(): string {
  return `${publicOrigin()}/mcp`;
}

async function probe(): Promise<McpServerInfo["status"]> {
  if (!env.mcpInternalUrl) return "disabled";
  try {
    const response = await fetch(`${env.mcpInternalUrl.replace(/\/+$/u, "")}/health/live`, {
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

export async function getServerInfo(): Promise<McpServerInfo> {
  return {
    url: mcpPublicUrl(),
    oauthMetadataUrl: `${publicOrigin()}/.well-known/oauth-authorization-server`,
    status: await probe(),
    checkedAt: formatISODateTime(new Date()),
  };
}

export async function listConnections(userId: string): Promise<McpConnection[]> {
  const rows = await mcpRepository.listConnections(userId);
  return rows
    .filter((row) => row.grantedAt)
    .map((row) => ({
      clientId: row.clientId,
      name: row.name,
      grantedAt: formatISODateTime(row.grantedAt as Date),
      lastUsedAt:
        row.lastUsedAt && row.lastUsedAt.getTime() > (row.grantedAt as Date).getTime()
          ? formatISODateTime(row.lastUsedAt)
          : null,
    }));
}

export async function revokeConnection(userId: string, clientId: string): Promise<void> {
  const removed = await mcpRepository.revoke(userId, clientId);
  if (removed === 0) throw new NotFoundError("Connected agent");
}

export async function getClient(clientId: string): Promise<McpClient> {
  const client = await mcpRepository.findClient(clientId);
  if (!client || client.disabled) throw new NotFoundError("Agent");
  let redirectHost: string | null = null;
  try {
    redirectHost = new URL(client.redirectUrls.split(",")[0] ?? "").host || null;
  } catch {
    redirectHost = null;
  }
  return { clientId: client.clientId, name: client.name, redirectHost };
}
