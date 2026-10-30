"use client";

import type { AssetCandidate, AssetClass } from "@luraba/contracts";
import * as React from "react";

import { AssetDisplay } from "@/components/display";
import { ComboboxControl, type FormComboboxOption } from "@/components/forms/form-combobox";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useImportAssetCandidateMutation } from "@/mutations/investments/use-investments-mutations";
import { useAssetSearchQuery, useAssetsQuery } from "@/queries/investments/use-investments-queries";

/**
 * Pick an asset from your catalog, or look one up at the market-data providers and add it on the
 * spot. Selecting a lookup result imports it into the catalog first, then selects it.
 */
export function AssetPicker({
  id = "asset-picker",
  value,
  onChange,
  assetClasses,
  disabled,
  ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (assetId: string) => void;
  /** Limit the catalog to these classes (e.g. fixed income only). */
  assetClasses?: readonly AssetClass[];
  disabled?: boolean;
  ariaInvalid?: boolean;
}) {
  const catalog = useAssetsQuery({ limit: 200 });
  const [term, setTerm] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const commit = useDebouncedCallback((next: string) => setDebounced(next), 350);
  const search = useAssetSearchQuery(
    { q: debounced, remote: true },
    { enabled: debounced.trim().length >= 2 },
  );
  const importCandidate = useImportAssetCandidateMutation({
    onSuccess: (asset) => {
      setTerm("");
      setDebounced("");
      onChange(asset.id);
    },
  });

  const assets = (catalog.data ?? []).filter(
    (asset) => !assetClasses || assetClasses.includes(asset.assetClass),
  );
  const options: FormComboboxOption[] = assets.map((asset) => ({
    value: asset.id,
    label: asset.symbol,
    description: asset.name,
    searchText: `${asset.symbol} ${asset.name}`,
  }));
  // Keep a selected asset visible even when it falls outside the first page of the catalog.
  const candidates = (search.data ?? []).filter((candidate) => !candidate.assetId);

  const choose = (candidate: AssetCandidate) =>
    importCandidate.mutate({
      symbol: candidate.symbol,
      name: candidate.name,
      assetClass: candidate.assetClass,
      exchange: candidate.exchange,
      country: candidate.country,
      currencyCode: candidate.currencyCode,
      provider: candidate.provider,
      providerSymbol: candidate.providerSymbol,
    });

  return (
    <div className="space-y-2">
      <ComboboxControl
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        placeholder="Select an asset"
        searchPlaceholder="Search your assets"
        emptyMessage="Not in your assets yet. Look it up below."
        disabled={disabled}
        ariaInvalid={ariaInvalid}
        renderOption={(option) => (
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">{option.label}</span>
            <span className="truncate text-muted-foreground">{option.description}</span>
          </span>
        )}
      />
      <Input
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          commit(event.target.value);
        }}
        placeholder="Look up a new ticker or name (AAPL, PETR4, Tesouro...)"
        aria-label="Look up an asset at the market-data providers"
        disabled={disabled}
      />
      {debounced.trim().length >= 2 ? (
        <ul
          className="max-h-48 divide-y overflow-y-auto rounded-md border"
          aria-label="Lookup results"
        >
          {search.isFetching ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
          ) : candidates.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              Nothing new found for "{debounced}".
            </li>
          ) : (
            candidates.map((candidate) => (
              <li
                key={`${candidate.provider}-${candidate.providerSymbol}`}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <AssetDisplay
                  asset={{
                    symbol: candidate.symbol,
                    name: candidate.name,
                    assetClass: candidate.assetClass ?? "OTHER",
                  }}
                  size="xs"
                />
                <PermissionButton
                  permission={PERMISSIONS.INVESTMENTS_WRITE}
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={importCandidate.isPending}
                  onClick={() => choose(candidate)}
                >
                  Add
                </PermissionButton>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
