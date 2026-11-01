export const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

type Page<T> = { data: T[]; meta: { pagination: { totalPages: number; totalCount: number } } };

/** Reads every page of a list endpoint (1000 rows per request, at most 50 pages). */
export async function fetchAllPages<T>(load: (page: number) => Promise<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await load(page);
    rows.push(...result.data);
    if (page >= result.meta.pagination.totalPages) break;
  }
  return rows;
}
