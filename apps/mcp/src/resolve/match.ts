/** Name matching for references an agent gives by name (accounts, categories, merchants, tags). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export type Named = { id: string; name: string };

export type Candidate = { id: string; name: string };

export type Resolution =
  | { status: "resolved"; id: string; name: string; match: "id" | "exact" | "approximate" }
  | { status: "ambiguous"; query: string; candidates: Candidate[] }
  | { status: "not_found"; query: string; suggestions: Candidate[] };

function tokenOverlap(a: string, b: string): number {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = b.split(" ").filter(Boolean);
  return right.filter((token) => left.has(token)).length;
}

const MAX_CANDIDATES = 8;

/**
 * An id, then an exact (case and accent insensitive) name, then a unique partial match. More than
 * one match at the same level is ambiguous: the candidates go back to the agent, nothing is guessed.
 */
export function resolveByName<T extends Named>(
  query: string,
  items: readonly T[],
  extraNames: (item: T) => string[] = () => [],
): Resolution {
  const trimmed = query.trim();
  if (isUuid(trimmed)) {
    const byId = items.find((item) => item.id.toLowerCase() === trimmed.toLowerCase());
    if (byId) return { status: "resolved", id: byId.id, name: byId.name, match: "id" };
    return { status: "not_found", query, suggestions: [] };
  }

  const needle = normalize(trimmed);
  const labelled = items.map((item) => ({
    item,
    labels: [item.name, ...extraNames(item)].map(normalize),
  }));

  const exact = labelled.filter(({ labels }) => labels.includes(needle));
  if (exact.length === 1 && exact[0])
    return { status: "resolved", id: exact[0].item.id, name: exact[0].item.name, match: "exact" };
  if (exact.length > 1)
    return {
      status: "ambiguous",
      query,
      candidates: exact
        .slice(0, MAX_CANDIDATES)
        .map(({ item }) => ({ id: item.id, name: item.name })),
    };

  const partial = labelled.filter(({ labels }) =>
    labels.some((label) => needle && (label.includes(needle) || needle.includes(label))),
  );
  if (partial.length === 1 && partial[0])
    return {
      status: "resolved",
      id: partial[0].item.id,
      name: partial[0].item.name,
      match: "approximate",
    };
  if (partial.length > 1)
    return {
      status: "ambiguous",
      query,
      candidates: partial
        .slice(0, MAX_CANDIDATES)
        .map(({ item }) => ({ id: item.id, name: item.name })),
    };

  const suggestions = labelled
    .map(({ item, labels }) => ({
      item,
      score: Math.max(0, ...labels.map((label) => tokenOverlap(label, needle))),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ item }) => ({ id: item.id, name: item.name }));
  return { status: "not_found", query, suggestions };
}
