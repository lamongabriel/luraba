import type { EndpointParams, EndpointResult } from "../api.js";
import type { productsEndpoints } from "./endpoints.js";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./requests.js";

export type { CreateProductInput, ListProductsQuery, UpdateProductInput };
export type GetProductParams = EndpointParams<typeof productsEndpoints.get>;
export type UpdateProductParams = EndpointParams<typeof productsEndpoints.update>;
export type DeleteProductParams = EndpointParams<typeof productsEndpoints.delete>;
export type ListProductsResult = EndpointResult<typeof productsEndpoints.list>;
export type GetProductResult = EndpointResult<typeof productsEndpoints.get>;
export type CreateProductResult = EndpointResult<typeof productsEndpoints.create>;
export type UpdateProductResult = EndpointResult<typeof productsEndpoints.update>;
export type DeleteProductResult = EndpointResult<typeof productsEndpoints.delete>;
