"use client";

import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import {
  countActive,
  createEmptyTree,
  decodeTree,
  encodeTree,
  readValues,
  setFieldRule,
} from "@/components/filters/tree";
import type { FilterTree, FilterValue, FilterValues } from "@/components/filters/types";

const URL_OPTIONS = { clearOnDefault: true, shallow: true } as const;

function scoped(prefix: string | undefined, key: string) {
  return prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
}

/**
 * URL-backed state of a page's filter chips. The whole tree lives in one `filter` parameter (`membersFilter` with
 * `keyPrefix: "members"`), so a filtered view can be shared and survives a reload. Changing a filter sends the list
 * back to page 1. The date filter is separate (`useDateFilter`): it is always applied and never part of this tree.
 */
export function useFilters({
  fieldIds,
  keyPrefix,
  defaultRules,
}: {
  /** The ids of the page's fields. Static: the URL state does not depend on the options. */
  fieldIds: readonly string[];
  keyPrefix?: string;
  /**
   * Chips present until the user changes them (invitations start on "Status is pending"). Clearing them leaves an
   * empty `[]` in the URL, so a cleared page does not snap back to the default.
   */
  defaultRules?: ReadonlyArray<readonly [id: string, operator: string, value: FilterValue]>;
}) {
  const defaultParam = defaultRules ? JSON.stringify(defaultRules) : null;
  const [param, setParam] = useQueryState(
    scoped(keyPrefix, "filter"),
    (defaultParam === null ? parseAsString : parseAsString.withDefault(defaultParam)).withOptions(
      URL_OPTIONS,
    ) as typeof parseAsString,
  );
  const [, setPage] = useQueryState(
    scoped(keyPrefix, "page"),
    parseAsInteger.withDefault(1).withOptions(URL_OPTIONS),
  );
  // With defaults, "no chips" is written as `[]`; without, as no parameter at all.
  const emptyParam = defaultParam === null ? null : "[]";
  const idsKey = fieldIds.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by content
  const known = React.useMemo(() => new Set(fieldIds), [idsKey]);

  // The tree can hold half-built chips (field picked, no value yet) that must not reach the URL or the API, so the
  // UI keeps its own copy and the URL only ever sees the complete rules.
  const [tree, setTree] = React.useState<FilterTree>(() => decodeTree(param, known));
  const treeRef = React.useRef(tree);
  treeRef.current = tree;

  React.useEffect(() => {
    // The URL changed from outside (back/forward, a shared link): adopt it unless it is what we wrote.
    if ((encodeTree(treeRef.current) ?? emptyParam) !== (param ?? emptyParam)) {
      setTree(decodeTree(param, known));
    }
  }, [param, known, emptyParam]);

  const onQueryChange = React.useCallback(
    (next: FilterTree) => {
      setTree(next);
      const encoded = encodeTree(next) ?? emptyParam;
      if (encoded !== (param ?? emptyParam)) {
        void setParam(encoded);
        void setPage(null);
      }
    },
    [param, setParam, setPage, emptyParam],
  );

  const setField = React.useCallback(
    (id: string, next: { operator: string; value: FilterValue } | null) =>
      onQueryChange(setFieldRule(treeRef.current, id, next)),
    [onQueryChange],
  );

  const clear = React.useCallback(() => {
    setTree(createEmptyTree());
    void setParam(emptyParam);
    void setPage(null);
  }, [setParam, setPage, emptyParam]);

  const values: FilterValues = React.useMemo(
    () => readValues(decodeTree(param, known)),
    [param, known],
  );
  const activeCount = countActive(tree);

  return {
    tree,
    onQueryChange,
    setField,
    clear,
    /** The complete, committed rules as plain values: what to turn into API params. */
    values,
    /** Number of complete chips. */
    activeCount,
    hasFilters: Boolean(param) && param !== "[]" && param !== defaultParam,
  };
}

export type FiltersState = ReturnType<typeof useFilters>;
