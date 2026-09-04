import type { EndpointParams, EndpointResult } from "../api.js";
import type { categoriesEndpoints } from "./endpoints.js";
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from "./requests.js";

export type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput };
export type UpdateCategoryParams = EndpointParams<typeof categoriesEndpoints.update>;
export type DeleteCategoryParams = EndpointParams<typeof categoriesEndpoints.delete>;
export type ListCategoriesResult = EndpointResult<typeof categoriesEndpoints.list>;
export type CreateCategoryResult = EndpointResult<typeof categoriesEndpoints.create>;
export type UpdateCategoryResult = EndpointResult<typeof categoriesEndpoints.update>;
export type DeleteCategoryResult = EndpointResult<typeof categoriesEndpoints.delete>;
