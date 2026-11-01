"use client";

import { useQuery } from "@tanstack/react-query";
import { getMcpClient, getMcpServerInfo, listMcpConnections } from "@/services/mcp.service";

const STATUS_REFRESH_MS = 30_000;

export const mcpQueryKeys = {
  all: ["mcp"] as const,
  server: () => [...mcpQueryKeys.all, "server"] as const,
  connections: () => [...mcpQueryKeys.all, "connections"] as const,
  client: (clientId: string) => [...mcpQueryKeys.all, "client", clientId] as const,
};

/** The endpoint and its live status; re-checked every 30 seconds while the page is open. */
export function useMcpServerQuery() {
  return useQuery({
    queryKey: mcpQueryKeys.server(),
    queryFn: getMcpServerInfo,
    refetchInterval: STATUS_REFRESH_MS,
  });
}

export function useMcpConnectionsQuery() {
  return useQuery({ queryKey: mcpQueryKeys.connections(), queryFn: listMcpConnections });
}

export function useMcpClientQuery(clientId: string | null) {
  return useQuery({
    queryKey: mcpQueryKeys.client(clientId ?? ""),
    queryFn: () => getMcpClient(clientId as string),
    enabled: Boolean(clientId),
    retry: false,
  });
}
