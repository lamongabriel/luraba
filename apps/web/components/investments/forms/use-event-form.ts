"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { EventBodyInput, InvestmentEvent } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import { useForm } from "react-hook-form";

import {
  useCreateInvestmentEventMutation,
  useUpdateInvestmentEventMutation,
} from "@/mutations/investments/use-investments-mutations";
import { type EventFormValues, eventFormSchema } from "./event-form.schema";
import { fieldsFor } from "./event-form-config";

function metaString(event: InvestmentEvent | undefined, key: string) {
  const value = event?.meta[key];
  return typeof value === "string" ? value : "";
}

export function getEventDefaults(
  event?: InvestmentEvent,
  seed: Partial<EventFormValues> = {},
): EventFormValues {
  return {
    accountId: event?.accountId ?? "",
    type: event?.type ?? "BUY",
    assetId: event?.assetId ?? "",
    targetAssetId: metaString(event, "targetAssetId"),
    tradeDate: event?.tradeDate ?? todayISODate(),
    quantity: event?.quantity ?? "",
    unitPrice: event?.unitPrice ?? "",
    grossAmount: event && !event.quantity ? event.grossAmount : "",
    fees: event && event.fees !== "0" ? event.fees : "",
    taxesWithheld: event && event.taxesWithheld !== "0" ? event.taxesWithheld : "",
    ratioFrom: metaString(event, "ratioFrom"),
    ratioTo: metaString(event, "ratioTo"),
    exchangeRatio: metaString(event, "exchangeRatio"),
    costRatio: metaString(event, "costRatio"),
    notes: event?.notes ?? "",
    ...seed,
  };
}

/** Turns the form's strings into the API body, leaving out what the type does not use. */
export function toEventBody(values: EventFormValues): EventBodyInput {
  const fields = fieldsFor(values.type);
  const meta: NonNullable<EventBodyInput["meta"]> = {};
  if (fields.ratio) {
    meta.ratioFrom = values.ratioFrom;
    meta.ratioTo = values.ratioTo;
  }
  if (fields.target) meta.targetAssetId = values.targetAssetId;
  if (fields.exchangeRatio) meta.exchangeRatio = values.exchangeRatio;
  if (fields.costRatio && values.costRatio) meta.costRatio = values.costRatio;

  return {
    accountId: values.accountId,
    type: values.type,
    tradeDate: values.tradeDate,
    assetId: fields.asset ? values.assetId : null,
    ...(fields.quantity && values.quantity ? { quantity: values.quantity } : {}),
    ...(fields.unitPrice && values.unitPrice ? { unitPrice: values.unitPrice } : {}),
    ...(fields.gross && values.grossAmount ? { grossAmount: values.grossAmount } : {}),
    ...(fields.fees && values.fees ? { fees: values.fees } : {}),
    ...(fields.taxes && values.taxesWithheld ? { taxesWithheld: values.taxesWithheld } : {}),
    notes: values.notes.trim() || null,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };
}

export function useEventForm({
  event,
  seed,
  onSuccess,
}: {
  event?: InvestmentEvent;
  seed?: Partial<EventFormValues>;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(event);
  const form = useForm<EventFormValues>({
    defaultValues: getEventDefaults(event, seed),
    resolver: zodResolver(eventFormSchema),
  });
  const create = useCreateInvestmentEventMutation({
    successToast: { title: "Transaction recorded" },
    onSuccess,
  });
  const update = useUpdateInvestmentEventMutation({
    successToast: { title: "Transaction updated" },
    onSuccess,
  });
  const isPending = create.isPending || update.isPending;
  const errorMessage = create.errorMessage || update.errorMessage;

  const onSubmit = form.handleSubmit((values) => {
    const body = toEventBody(values);
    if (event) {
      update.reset();
      update.mutate({ id: event.id, body });
    } else {
      create.reset();
      create.mutate(body);
    }
  });

  return { form, onSubmit, isEdit, isPending, errorMessage };
}
