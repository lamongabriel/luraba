"use client";

import { mcpEndpoints } from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function getMcpServerInfo() {
  return requestContract(mcpEndpoints.info);
}

export function listMcpConnections() {
  return requestContract(mcpEndpoints.listConnections);
}

export function revokeMcpConnection(clientId: string): Promise<void> {
  return requestContract(mcpEndpoints.revokeConnection, { params: { clientId } });
}

export function getMcpClient(clientId: string) {
  return requestContract(mcpEndpoints.getClient, { params: { clientId } });
}
