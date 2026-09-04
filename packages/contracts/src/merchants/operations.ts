import type { EndpointParams, EndpointResult } from "../api.js";
import type { merchantsEndpoints } from "./endpoints.js";
import type { CreateMerchantInput, ListMerchantsQuery, UpdateMerchantInput } from "./requests.js";

export type { CreateMerchantInput, ListMerchantsQuery, UpdateMerchantInput };
export type GetMerchantParams = EndpointParams<typeof merchantsEndpoints.get>;
export type UpdateMerchantParams = EndpointParams<typeof merchantsEndpoints.update>;
export type DeleteMerchantParams = EndpointParams<typeof merchantsEndpoints.delete>;
export type ListMerchantsResult = EndpointResult<typeof merchantsEndpoints.list>;
export type GetMerchantResult = EndpointResult<typeof merchantsEndpoints.get>;
export type CreateMerchantResult = EndpointResult<typeof merchantsEndpoints.create>;
export type UpdateMerchantResult = EndpointResult<typeof merchantsEndpoints.update>;
export type DeleteMerchantResult = EndpointResult<typeof merchantsEndpoints.delete>;
