"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { CreditCardPreview } from "@/components/finance/credit-card-preview";
import { FormSheet } from "@/components/finance/forms/form-sheet";
import { MoneyValue } from "@/components/finance/money-value";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CreditCardHttp } from "@/interfaces/http/credit-cards";
import { useAppMutation } from "@/lib/mutations";
import { createCreditCard, updateCreditCard } from "@/services/credit-cards.service";
import { useAuthStore } from "@/stores/auth.store";

type CreditCardFormValues = {
  name: string;
  institutionName: string;
  institutionDomain: string;
  notes: string;
  currencyCode: string;
  brand: string;
  last4: string;
  color: string;
  closingDay: string;
  dueDay: string;
};

const BRAND_OPTIONS = ["Visa", "Mastercard", "American Express", "Elo", "Hipercard", "Other"];
const COLOR_OPTIONS = ["Midnight", "Green", "Blue", "Wine", "Gold", "Purple"];

export function CreditCardFormSheet({
  open,
  onOpenChange,
  card,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCardHttp;
}) {
  const queryClient = useQueryClient();
  const preferredCurrency = useAuthStore((state) => state.user?.preferences.currency ?? "BRL");
  const resetValues = React.useMemo<CreditCardFormValues>(
    () => ({
      name: card?.name ?? "",
      institutionName: card?.institutionName ?? "",
      institutionDomain: card?.institutionDomain ?? "",
      notes: card?.notes ?? "",
      currencyCode: card?.currencyCode ?? preferredCurrency,
      brand: card?.brand ?? "Visa",
      last4: card?.last4 ?? "",
      color: card?.color ?? "Midnight",
      closingDay: String(card?.closingDay ?? 7),
      dueDay: String(card?.dueDay ?? 15),
    }),
    [
      card?.brand,
      card?.closingDay,
      card?.color,
      card?.currencyCode,
      card?.dueDay,
      card?.institutionDomain,
      card?.institutionName,
      card?.last4,
      card?.name,
      card?.notes,
      preferredCurrency,
    ],
  );
  const wasOpenRef = React.useRef(false);

  const form = useForm<CreditCardFormValues>({
    defaultValues: resetValues,
  });

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  const mutation = useAppMutation({
    mutationFn: async (values: CreditCardFormValues) => {
      const createPayload = {
        name: values.name,
        institutionName: values.institutionName || undefined,
        institutionDomain: values.institutionDomain || undefined,
        notes: values.notes || undefined,
        currencyCode: values.currencyCode,
        brand: values.brand,
        last4: values.last4,
        color: values.color || undefined,
        closingDay: Number(values.closingDay),
        dueDay: Number(values.dueDay),
      };

      if (card) {
        return updateCreditCard(card.id, {
          name: createPayload.name,
          institutionName: createPayload.institutionName ?? null,
          institutionDomain: createPayload.institutionDomain ?? null,
          notes: createPayload.notes ?? null,
          brand: createPayload.brand,
          last4: createPayload.last4,
          color: createPayload.color ?? null,
          closingDay: createPayload.closingDay,
          dueDay: createPayload.dueDay,
        });
      }

      return createCreditCard(createPayload);
    },
    onSuccess: async (savedCard) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-cards", savedCard.id] }),
      ]);
      onOpenChange(false);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={card ? "Edit credit card" : "Create credit card"}
      description="Configure the card metadata, billing dates, and live card appearance."
      className="sm:max-w-2xl"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_1fr]">
        <div className="xl:sticky xl:top-0">
          <CreditCardPreview
            brand={form.watch("brand")}
            last4={form.watch("last4") || "1234"}
            name={form.watch("name") || "YOUR CARD"}
            color={form.watch("color")}
            subtitle={`Closes on day ${form.watch("closingDay") || "7"} • Due on day ${form.watch("dueDay") || "15"}`}
            balance={card ? <MoneyValue amount={card.balance} currencyCode={card.currencyCode} /> : undefined}
            detail
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="credit-card-name">Card name</Label>
            <Input id="credit-card-name" placeholder="Nubank Ultravioleta" {...form.register("name", { required: true })} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={form.watch("brand")} onValueChange={(value) => form.setValue("brand", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-card-last4">Last 4 digits</Label>
              <Input
                id="credit-card-last4"
                placeholder="1234"
                maxLength={4}
                {...form.register("last4", {
                  required: true,
                  onChange: (event) => {
                    form.setValue("last4", event.target.value.replace(/\D/g, "").slice(0, 4));
                  },
                })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.watch("currencyCode")}
                onValueChange={(value) => form.setValue("currencyCode", value)}
                disabled={Boolean(card)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Brazilian Real (BRL)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Card color</Label>
              <Select value={form.watch("color")} onValueChange={(value) => form.setValue("color", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credit-card-closing-day">Closing day</Label>
              <Input id="credit-card-closing-day" type="number" min={1} max={31} {...form.register("closingDay")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-card-due-day">Due day</Label>
              <Input id="credit-card-due-day" type="number" min={1} max={31} {...form.register("dueDay")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credit-card-institution-name">Institution</Label>
              <Input id="credit-card-institution-name" placeholder="Nubank" {...form.register("institutionName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-card-institution-domain">Institution domain</Label>
              <Input id="credit-card-institution-domain" placeholder="nubank.com.br" {...form.register("institutionDomain")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit-card-notes">Notes</Label>
            <Textarea id="credit-card-notes" placeholder="Optional notes about this card" {...form.register("notes")} />
          </div>

          <FormErrorBoundary error={mutation.error} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : card ? "Save changes" : "Create credit card"}
            </Button>
          </div>
        </form>
      </div>
    </FormSheet>
  );
}
