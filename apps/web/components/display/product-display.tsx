"use client";

import { uploadContentUrl } from "@/lib/uploads";
import { cn } from "@/lib/utils";

import { DISPLAY_SIZES, type DisplaySize, EMPTY_LABELS, PRODUCT_FALLBACK } from "./constants";
import { DisplayMark } from "./display-mark";

type ProductLike = { name: string; imageUploadId?: string | null };

/** Just the product's picture, or the package icon when there is none. */
export function ProductMark({
  product,
  size = "sm",
  className,
}: {
  product: Pick<ProductLike, "imageUploadId"> | null | undefined;
  size?: DisplaySize;
  className?: string;
}) {
  return (
    <DisplayMark
      imageUrl={product?.imageUploadId ? uploadContentUrl(product.imageUploadId) : null}
      icon={PRODUCT_FALLBACK.icon}
      color={PRODUCT_FALLBACK.color}
      size={size}
      className={className}
    />
  );
}

/** How a product (or a transaction item) is shown everywhere: picture + name, optional detail line. */
export function ProductDisplay({
  product,
  size = "sm",
  detail,
  className,
  emptyLabel = EMPTY_LABELS.product,
}: {
  product: ProductLike | null | undefined;
  size?: DisplaySize;
  /** A second line, e.g. a formatted price or "2 × $15.00". */
  detail?: React.ReactNode;
  className?: string;
  emptyLabel?: string;
}) {
  const dims = DISPLAY_SIZES[size];
  if (!product) {
    return <span className={cn("text-muted-foreground", dims.text, className)}>{emptyLabel}</span>;
  }

  return (
    <span className={cn("flex min-w-0 items-center", dims.gap, className)}>
      <ProductMark product={product} size={size} />
      <span className="min-w-0">
        <span className={cn("block truncate font-medium", dims.text)}>{product.name}</span>
        {detail ? (
          <span className={cn("block truncate text-muted-foreground", dims.subtext)}>{detail}</span>
        ) : null}
      </span>
    </span>
  );
}
