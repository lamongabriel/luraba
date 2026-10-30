"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { createProduct, deleteProduct, updateProduct } from "@/services/products.service";

type CreateProductBody = Parameters<typeof createProduct>[0];
type CreateProductResponse = Awaited<ReturnType<typeof createProduct>>;
type UpdateProductVariables = {
  id: string;
  body: Parameters<typeof updateProduct>[1];
};
type UpdateProductResponse = Awaited<ReturnType<typeof updateProduct>>;

export const createProductMutationDefinition = createAppMutationDefinition<
  CreateProductResponse,
  CreateProductBody
>({
  defaultErrorMessage: "We couldn't create this product. Please try again.",
  mutationFn: createProduct,
  mutationKey: ["products", "create"],
});
export function useCreateProductMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateProductResponse, CreateProductBody, TContext>,
) {
  return useAppMutation(createProductMutationDefinition, options);
}

export const updateProductMutationDefinition = createAppMutationDefinition<
  UpdateProductResponse,
  UpdateProductVariables
>({
  defaultErrorMessage: "We couldn't update this product. Please try again.",
  mutationFn: ({ id, body }) => updateProduct(id, body),
  mutationKey: ["products", "update"],
});
export function useUpdateProductMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateProductResponse, UpdateProductVariables, TContext>,
) {
  return useAppMutation(updateProductMutationDefinition, options);
}

export const deleteProductMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this product. Please try again.",
  mutationFn: deleteProduct,
  mutationKey: ["products", "delete"],
});
export function useDeleteProductMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteProductMutationDefinition, options);
}
