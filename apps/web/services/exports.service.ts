"use client";

import { type ExportFormat, exportsEndpoints } from "@luraba/contracts";
import { lurabaApiClient } from "@/api/luraba-api";
import { requestContract } from "@/services/contract-client.service";

export const listExporters = () => requestContract(exportsEndpoints.list);

/** Downloads an export through the authenticated client and hands the file to the browser. */
export async function downloadExport(
  exporterId: string,
  params: { format: ExportFormat; dateFrom?: string; dateTo?: string },
): Promise<string> {
  const response = await lurabaApiClient.get<Blob>(`/exports/${encodeURIComponent(exporterId)}`, {
    params,
    responseType: "blob",
  });
  const disposition = String(response.headers["content-disposition"] ?? "");
  const fileName =
    /filename="([^"]+)"/u.exec(disposition)?.[1] ?? `luraba-${exporterId}.${params.format}`;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
