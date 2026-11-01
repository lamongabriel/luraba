import { TableSkeleton } from "@/components/states";

export const API_KEYS_COLUMN_COUNT = 7;

export function ApiKeysLoading() {
  return <TableSkeleton columns={API_KEYS_COLUMN_COUNT} rows={3} label="Loading API keys" />;
}
