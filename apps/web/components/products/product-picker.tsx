"use client";

import { PackageAddIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Product } from "@luraba/contracts";
import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";
import { AmountDisplay, ProductDisplay } from "@/components/display";
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 8;

/**
 * A text field that suggests saved products as you type (picture, name and latest price). Pick one
 * to link it, or keep typing a new name: the caller decides what a new name means (the transaction
 * form saves it as a product when the transaction is saved). Editing the text of a linked product
 * unlinks it.
 */
export function ProductPicker({
  id,
  text,
  products,
  linkedProductId,
  precisionOf,
  onTextChange,
  onPick,
  placeholder = "Search or add a product",
  invalid,
  onBlur,
}: {
  id?: string;
  /** What is typed in the field (the item's name). */
  text: string;
  products: readonly Product[];
  /** The product the text is linked to, if any. */
  linkedProductId?: string;
  precisionOf: (currencyCode: string | undefined) => number;
  onTextChange: (text: string) => void;
  onPick: (product: Product) => void;
  placeholder?: string;
  invalid?: boolean;
  onBlur?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const query = text.trim().toLowerCase();
  const matches = React.useMemo(
    () =>
      products
        .filter((product) => query === "" || product.name.toLowerCase().includes(query))
        .slice(0, MAX_SUGGESTIONS),
    [products, query],
  );
  const exactMatch = products.some((product) => product.name.toLowerCase() === query);
  const canCreate = query !== "" && !exactMatch && !linkedProductId;
  const showList = open && (matches.length > 0 || canCreate);

  return (
    <Command shouldFilter={false} className="overflow-visible bg-transparent p-0">
      <Popover open={showList} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <CommandPrimitive.Input
              id={id}
              value={text}
              placeholder={placeholder}
              aria-invalid={invalid}
              autoComplete="off"
              onValueChange={(value) => {
                onTextChange(value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                setOpen(false);
                onBlur?.();
              }}
              className={cn(
                "h-7 w-full min-w-0 rounded-xl border border-border/90 bg-[var(--color-container-inset)] px-2.5 py-1 text-xs font-normal outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
                canCreate && text.trim() !== "" && "pr-16",
              )}
            />
            {canCreate ? (
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[0.65rem] text-muted-foreground">
                New
              </span>
            ) : null}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-64 p-1"
          onOpenAutoFocus={(event) => event.preventDefault()}
          // Keep the input focused while the user clicks a suggestion.
          onMouseDown={(event) => event.preventDefault()}
        >
          <CommandList className="max-h-60">
            <CommandEmpty className="px-2 py-4 text-xs">No saved products match.</CommandEmpty>
            {matches.map((product) => (
              <CommandItem
                key={product.id}
                value={product.id}
                className="min-h-8 justify-between gap-3 rounded-md px-2 py-1"
                onSelect={() => {
                  onPick(product);
                  setOpen(false);
                }}
              >
                <ProductDisplay product={product} size="sm" />
                {product.price != null ? (
                  <AmountDisplay
                    amount={product.price}
                    currencyCode={product.currencyCode}
                    precision={precisionOf(product.currencyCode)}
                    showSign={false}
                    size="xs"
                  />
                ) : null}
              </CommandItem>
            ))}
            {canCreate ? (
              <CommandItem
                value="__create__"
                className="min-h-8 gap-2 rounded-md px-2 py-1"
                onSelect={() => setOpen(false)}
              >
                <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} className="size-4" />
                <span className="truncate">Add “{text.trim()}” as a new product</span>
              </CommandItem>
            ) : null}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
}
