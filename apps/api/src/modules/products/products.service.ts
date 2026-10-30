import type {
  createProductBodySchema,
  Product,
  updateProductBodySchema,
} from "@luraba/contracts/products";
import { formatISODateTime } from "@luraba/domain";
import type { z } from "zod";
import type { HouseholdContext } from "@/config/permissions";
import { fxService } from "@/modules/fx/fx.service";
import { householdsRepository } from "@/modules/households/households.repository";
import { assertHouseholdImageUpload } from "@/modules/uploads/uploads.guards";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import type { ListProductsQuery } from "./products.query";
import { productsRepository } from "./products.repository";
import type { ProductRecord } from "./products.types";

type CreateProductInput = z.output<typeof createProductBodySchema>;
type UpdateProductInput = z.output<typeof updateProductBodySchema>;

export function mapProductRecord(product: ProductRecord): Product {
  return {
    id: product.id,
    name: product.name,
    imageUploadId: product.imageUploadId ?? null,
    price: product.price ?? null,
    currencyCode: product.currencyId,
    createdByUserId: product.createdByUserId,
    createdAt: formatISODateTime(product.createdAt),
    updatedAt: formatISODateTime(product.updatedAt),
  };
}

async function resolveCurrency(context: HouseholdContext, requested?: string): Promise<string> {
  if (requested) {
    const code = requested.toUpperCase();
    await fxService.assertCurrencyExists(code);
    return code;
  }
  const household = await householdsRepository.findHouseholdById(context.householdId);
  if (!household) throw new NotFoundError("Household");
  return household.defaultCurrencyId;
}

export async function createProduct(
  context: HouseholdContext,
  body: CreateProductInput,
): Promise<Product> {
  if (await productsRepository.findByName(context, body.name)) {
    throw new ConflictError("A product with this name already exists");
  }
  const product = await productsRepository.create(context, {
    name: body.name,
    price: body.price ?? null,
    currencyId: await resolveCurrency(context, body.currencyCode),
  });
  return mapProductRecord(product);
}

export async function listProducts(
  context: HouseholdContext,
  query: ListProductsQuery,
): Promise<ListResult<Product>> {
  const page = await productsRepository.listPage(context, query);
  return { data: page.rows.map(mapProductRecord), meta: createListMeta(query, page.totalCount) };
}

export async function getProduct(context: HouseholdContext, productId: string): Promise<Product> {
  const product = await productsRepository.get(productId, context);
  if (!product) throw new NotFoundError("Product");
  return mapProductRecord(product);
}

export async function updateProduct(
  context: HouseholdContext,
  productId: string,
  body: UpdateProductInput,
): Promise<Product> {
  const product = await productsRepository.get(productId, context);
  if (!product) throw new NotFoundError("Product");

  if (body.name && body.name !== product.name) {
    const existing = await productsRepository.findByName(context, body.name);
    if (existing && existing.id !== productId) {
      throw new ConflictError("A product with this name already exists");
    }
  }
  if (body.imageUploadId) {
    await assertHouseholdImageUpload(context, body.imageUploadId, "imageUploadId");
  }

  const updated = await productsRepository.update(productId, context, {
    name: body.name,
    price: body.price,
    imageUploadId: body.imageUploadId,
  });
  if (!updated) throw new NotFoundError("Product");
  return mapProductRecord(updated);
}

export async function deleteProduct(context: HouseholdContext, productId: string): Promise<void> {
  const deleted = await productsRepository.delete(productId, context);
  if (!deleted) throw new NotFoundError("Product");
}
