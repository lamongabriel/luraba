"use client";

import type { ImportRow } from "@luraba/contracts";
import * as React from "react";
import { CategorySelectControl } from "@/components/forms/form-category-select";
import { TagSelectControl } from "@/components/forms/form-tag-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/masked-input";
import { Switch } from "@/components/ui/switch";
import { useUpdateImportRowsMutation } from "@/mutations/imports/use-import-mutations";
import { MerchantPicker } from "./import-pickers";

/** Overrides for one row. Leaving a field empty keeps following the mapping from step 3. */
export function ImportRowDialog({
  batchId,
  row,
  onOpenChange,
}: {
  batchId: string;
  row: ImportRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateImportRowsMutation();
  const [merchantId, setMerchantId] = React.useState<string | null>(null);
  const [categoryId, setCategoryId] = React.useState("");
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [description, setDescription] = React.useState("");
  const [isInstallment, setIsInstallment] = React.useState(false);
  const [installmentNumber, setInstallmentNumber] = React.useState("");
  const [installmentTotal, setInstallmentTotal] = React.useState("");

  React.useEffect(() => {
    if (!row) return;
    setMerchantId(row.merchantId);
    setCategoryId(row.categoryId ?? "");
    setTagIds(row.tagIds ?? []);
    setDescription(row.descriptionOverride ?? "");
    setIsInstallment(Boolean(row.installmentTotal));
    setInstallmentNumber(row.installmentNumber ? String(row.installmentNumber) : "");
    setInstallmentTotal(row.installmentTotal ? String(row.installmentTotal) : "");
  }, [row]);

  if (!row) return null;

  const number = Number(installmentNumber);
  const total = Number(installmentTotal);
  const installmentValid =
    !isInstallment || (Number.isInteger(number) && total >= 2 && number >= 1 && number <= total);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit this row</DialogTitle>
          <DialogDescription>
            Only for this row. To change every row with the same name, go back to step 3.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-muted px-3 py-2 text-xs break-words">{row.description}</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="row-description">Description in Luraba</Label>
            <Input
              id="row-description"
              value={description}
              placeholder={row.description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                id="row-installment"
                checked={isInstallment}
                onCheckedChange={setIsInstallment}
                aria-label="Installment purchase"
              />
              <Label htmlFor="row-installment">Installment purchase</Label>
            </div>
            {isInstallment ? (
              <div className="flex items-center gap-2">
                <NumberInput
                  aria-label="Installment number"
                  value={installmentNumber}
                  onValueChange={setInstallmentNumber}
                  placeholder="4"
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">of</span>
                <NumberInput
                  aria-label="Number of installments"
                  value={installmentTotal}
                  onValueChange={setInstallmentTotal}
                  placeholder="12"
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground">
                  All installments cost the same; earlier ones are added too.
                </span>
              </div>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="row-merchant">Merchant</Label>
            <MerchantPicker
              id="row-merchant"
              value={merchantId}
              onChange={setMerchantId}
              suggestedName={row.counterparty ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="row-category">Category</Label>
            <CategorySelectControl
              id="row-category"
              value={categoryId}
              onChange={setCategoryId}
              allowClear
              clearLabel="Follow the mapping"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="row-tags">Tags</Label>
            <TagSelectControl
              id="row-tags"
              value={tagIds}
              onChange={setTagIds}
              placeholder="Follow the mapping"
              maxVisibleTags={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={update.isPending || !installmentValid}
            onClick={() =>
              update.mutate(
                {
                  id: batchId,
                  body: {
                    rowIds: [row.id],
                    merchantId,
                    categoryId: categoryId || null,
                    tagIds: tagIds.length > 0 ? tagIds : null,
                    descriptionOverride: description.trim() || null,
                    installment: isInstallment ? { number, total } : null,
                  },
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
