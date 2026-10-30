"use client";

import {
  type CreateProductInput,
  type CreateProductResult,
  type DeleteProductResult,
  type GetProductResult,
  type ListProductsQuery,
  type ListProductsResult,
  productsEndpoints,
  type UpdateProductInput,
  type UpdateProductResult,
} from "@luraba/contracts";
import { requestContract } from "@/services/contract-client.service";

export function listProducts(query: ListProductsQuery = {}): Promise<ListProductsResult> {
  return requestContract(productsEndpoints.list, { query });
}

export function getProduct(id: string): Promise<GetProductResult> {
  return requestContract(productsEndpoints.get, { params: { id } });
}

export function createProduct(input: CreateProductInput): Promise<CreateProductResult> {
  return requestContract(productsEndpoints.create, { body: input });
}

export function updateProduct(id: string, input: UpdateProductInput): Promise<UpdateProductResult> {
  return requestContract(productsEndpoints.update, { params: { id }, body: input });
}

export function deleteProduct(id: string): Promise<DeleteProductResult> {
  return requestContract(productsEndpoints.delete, { params: { id } });
}
