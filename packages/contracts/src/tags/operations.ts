import type { EndpointParams, EndpointResult } from "../api.js";
import type { tagsEndpoints } from "./endpoints.js";
import type { CreateTagInput, ListTagsQuery, UpdateTagInput } from "./requests.js";

export type { CreateTagInput, ListTagsQuery, UpdateTagInput };
export type UpdateTagParams = EndpointParams<typeof tagsEndpoints.update>;
export type DeleteTagParams = EndpointParams<typeof tagsEndpoints.delete>;
export type ListTagsResult = EndpointResult<typeof tagsEndpoints.list>;
export type CreateTagResult = EndpointResult<typeof tagsEndpoints.create>;
export type UpdateTagResult = EndpointResult<typeof tagsEndpoints.update>;
export type DeleteTagResult = EndpointResult<typeof tagsEndpoints.delete>;
