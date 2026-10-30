"use client";

import { PERMISSIONS, type Product } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { ProductMark } from "@/components/display";
import { EntityImageField } from "@/components/uploads/entity-image-field";
import { useUpdateProductMutation } from "@/mutations/products/use-product-mutations";
import { productQueryKeys } from "@/queries/products/use-products-query";
import { transactionItemsQueryKeys } from "@/queries/transactions/use-transaction-items-query";

/** The product's picture, shown wherever the product or one of its transaction items appears. */
export function ProductImageField({ product }: { product: Product }) {
  const client = useQueryClient();
  const update = useUpdateProductMutation({
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: productQueryKeys.all }),
        client.invalidateQueries({ queryKey: transactionItemsQueryKeys.all }),
      ]),
  });

  return (
    <EntityImageField
      targetType="product"
      permission={PERMISSIONS.PRODUCTS_UPDATE}
      targetId={product.id}
      attachmentRole="image"
      noun="picture"
      uploadId={product.imageUploadId}
      preview={<ProductMark product={product} size="lg" />}
      onChange={(imageUploadId) => update.mutateAsync({ id: product.id, body: { imageUploadId } })}
    />
  );
}
