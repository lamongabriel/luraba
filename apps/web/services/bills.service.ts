"use client";

import {
  type BillForecastQuery,
  type BillForecastResult,
  type BillOccurrenceResult,
  billsEndpoints,
  type CreateBillInput,
  type GetBillResult,
  type LinkBillOccurrenceInput,
  type ListBillOccurrencesQuery,
  type ListBillOccurrencesResult,
  type ListBillsQuery,
  type ListBillsResult,
  type UpdateBillInput,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listBills(query: ListBillsQuery = {}): Promise<ListBillsResult> {
  return requestContract(billsEndpoints.list, { query });
}

export function getBillForecast(query: BillForecastQuery): Promise<BillForecastResult> {
  return requestContract(billsEndpoints.forecast, { query });
}

export function getBill(id: string): Promise<GetBillResult> {
  return requestContract(billsEndpoints.get, { params: { id } });
}

export function createBill(input: CreateBillInput): Promise<GetBillResult> {
  return requestContract(billsEndpoints.create, { body: input });
}

export function updateBill(id: string, input: UpdateBillInput): Promise<GetBillResult> {
  return requestContract(billsEndpoints.update, { params: { id }, body: input });
}

export function pauseBill(id: string): Promise<GetBillResult> {
  return requestContract(billsEndpoints.pause, { params: { id } });
}

export function resumeBill(id: string): Promise<GetBillResult> {
  return requestContract(billsEndpoints.resume, { params: { id } });
}

export function cancelBill(id: string): Promise<GetBillResult> {
  return requestContract(billsEndpoints.cancel, { params: { id } });
}

export function deleteBill(id: string): Promise<void> {
  return requestContract(billsEndpoints.delete, { params: { id } });
}

export function listBillOccurrences(
  id: string,
  query: ListBillOccurrencesQuery = {},
): Promise<ListBillOccurrencesResult> {
  return requestContract(billsEndpoints.listOccurrences, { params: { id }, query });
}

type OccurrenceTarget = { id: string; occurrenceId: string };

export function linkBillOccurrence(
  target: OccurrenceTarget,
  input: LinkBillOccurrenceInput,
): Promise<BillOccurrenceResult> {
  return requestContract(billsEndpoints.linkOccurrence, { params: target, body: input });
}

export function markBillOccurrencePaid(target: OccurrenceTarget): Promise<BillOccurrenceResult> {
  return requestContract(billsEndpoints.markOccurrencePaid, { params: target });
}

export function skipBillOccurrence(target: OccurrenceTarget): Promise<BillOccurrenceResult> {
  return requestContract(billsEndpoints.skipOccurrence, { params: target });
}

export function resetBillOccurrence(target: OccurrenceTarget): Promise<BillOccurrenceResult> {
  return requestContract(billsEndpoints.resetOccurrence, { params: target });
}
