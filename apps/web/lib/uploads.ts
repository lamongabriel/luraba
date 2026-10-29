import { apiConfig } from "@/config/api";

/** Browser URL of a stored file. The session cookie authorizes it, so it works in <img> and <a>. */
export function uploadContentUrl(uploadId: string, options: { download?: boolean } = {}): string {
  const url = `${apiConfig.restBaseUrl}/uploads/${uploadId}/content`;
  return options.download ? `${url}?download=1` : url;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
