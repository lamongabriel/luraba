"use client";

import {
  type CreatePaymentMethodInput,
  type CreatePaymentMethodResult,
  type DeletePaymentMethodResult,
  type ListPaymentMethodsQuery,
  type ListPaymentMethodsResult,
  paymentMethodsEndpoints,
  type UpdatePaymentMethodInput,
  type UpdatePaymentMethodResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listPaymentMethods(
  query: ListPaymentMethodsQuery = {},
): Promise<ListPaymentMethodsResult> {
  return requestContract(paymentMethodsEndpoints.list, { query });
}

export function createPaymentMethod(
  input: CreatePaymentMethodInput,
): Promise<CreatePaymentMethodResult> {
  return requestContract(paymentMethodsEndpoints.create, { body: input });
}

export function updatePaymentMethod(
  id: string,
  input: UpdatePaymentMethodInput,
): Promise<UpdatePaymentMethodResult> {
  return requestContract(paymentMethodsEndpoints.update, {
    params: { id },
    body: input,
  });
}

export function deletePaymentMethod(id: string): Promise<DeletePaymentMethodResult> {
  return requestContract(paymentMethodsEndpoints.delete, { params: { id } });
}
