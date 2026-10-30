import { productsEndpoints } from "@luraba/contracts/products";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { withApiMeta } from "@/shared/response";
import * as productsService from "./products.service";

export const create = createHouseholdHandler({
  body: productsEndpoints.create.body,
  response: productsEndpoints.create.response,
  handle: ({ household, body }) => productsService.createProduct(household, body),
  status: "created",
});

export const list = createHouseholdHandler({
  query: productsEndpoints.list.query,
  response: productsEndpoints.list.response,
  meta: productsEndpoints.list.meta,
  handle: async ({ household, query }) => {
    const result = await productsService.listProducts(household, query);
    return withApiMeta(result.data, result.meta);
  },
});

export const details = createHouseholdHandler({
  params: productsEndpoints.get.params,
  response: productsEndpoints.get.response,
  handle: ({ household, params }) => productsService.getProduct(household, params.id),
});

export const update = createHouseholdHandler({
  params: productsEndpoints.update.params,
  body: productsEndpoints.update.body,
  response: productsEndpoints.update.response,
  handle: ({ household, params, body }) =>
    productsService.updateProduct(household, params.id, body),
});

export const deleteProduct = createHouseholdHandler({
  params: productsEndpoints.delete.params,
  status: "no-content",
  handle: ({ household, params }) => productsService.deleteProduct(household, params.id),
});
