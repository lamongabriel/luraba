"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@luraba/contracts";
import { useForm } from "react-hook-form";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { queryClient } from "@/lib/query-client";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from "@/mutations/products/use-product-mutations";
import { useCurrenciesQuery } from "@/queries/currencies/use-currencies-query";
import { productQueryKeys } from "@/queries/products/use-products-query";
import { transactionItemsQueryKeys } from "@/queries/transactions/use-transaction-items-query";

import {
  type CreateEditProductFormValues,
  createEditProductFormSchema,
} from "./create-edit-product-form.schema";

/** The currency the price is in: the product's own, or the household default for a new one. */
export function useProductPrecision(currencyCode: string | undefined) {
  const currencies = useCurrenciesQuery({ perPage: 100 });
  return currencies.data?.data.find((c) => c.code === currencyCode)?.precision ?? 2;
}

export function useCreateEditProductForm({
  product,
  currencyCode,
  onSaved,
}: {
  product?: Product;
  currencyCode: string;
  onSaved: (product: Product, isNew: boolean) => void;
}) {
  const isEdit = Boolean(product);
  const precision = useProductPrecision(product?.currencyCode ?? currencyCode);
  const form = useForm<CreateEditProductFormValues>({
    defaultValues: {
      name: product?.name ?? "",
      price: product?.price != null ? minorToMajorUnits(product.price, precision) : "",
    },
    resolver: zodResolver(createEditProductFormSchema),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: transactionItemsQueryKeys.all }),
    ]);

  const createMutation = useCreateProductMutation({
    onSuccess: async (created) => {
      await refresh();
      onSaved(created, true);
    },
  });
  const updateMutation = useUpdateProductMutation({
    onSuccess: async (updated) => {
      await refresh();
      onSaved(updated, false);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMessage = createMutation.errorMessage || updateMutation.errorMessage;

  const onSubmit = form.handleSubmit((values) => {
    const name = values.name.trim();
    const price = values.price === "" ? null : majorToMinorUnits(values.price, precision);

    if (isEdit && product) {
      updateMutation.reset();
      updateMutation.mutate({ id: product.id, body: { name, price } });
      return;
    }

    createMutation.reset();
    createMutation.mutate({ name, ...(price ? { price, currencyCode } : {}) });
  });

  return {
    form,
    onSubmit,
    isEdit,
    isPending,
    errorMessage,
    currencyCode: product?.currencyCode ?? currencyCode,
  };
}
