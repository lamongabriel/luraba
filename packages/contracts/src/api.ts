import { z } from "zod";

export const MAX_PER_PAGE = 1000;

export type SortDirection = "asc" | "desc";

export interface BaseListQuery<TSort extends string = string> {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: TSort;
  sortDirection?: SortDirection;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

export interface ListMeta<TSummary = never> {
  pagination: PaginationMeta;
  summary?: TSummary;
}

export interface ListResponse<TData, TSummary = never> {
  data: TData[];
  meta: ListMeta<TSummary>;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponseMeta {
  pagination?: PaginationMeta;
  summary?: unknown;
}

export interface ApiFailureResponse {
  success: false;
  error: ApiError;
  meta?: ApiResponseMeta;
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  meta?: ApiResponseMeta;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiFailureResponse;

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1).max(MAX_PER_PAGE),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const apiResponseMetaSchema = z
  .object({
    pagination: paginationMetaSchema.optional(),
    summary: z.unknown().optional(),
  })
  .passthrough();

export const apiErrorSchema = z.object({ code: z.string(), message: z.string() });

export const apiFailureResponseSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
  meta: apiResponseMetaSchema.optional(),
});

export function apiSuccessResponseSchema<TSchema extends z.ZodType>(data: TSchema) {
  return z.object({
    success: z.literal(true),
    data,
    meta: apiResponseMetaSchema.optional(),
  });
}

export type HttpMethod = "delete" | "get" | "patch" | "post" | "put";
export type HttpSuccessStatus = 200 | 201 | 204;
export type ContractSchema = z.ZodType;

export interface EndpointContract<
  TParams extends ContractSchema | undefined = ContractSchema | undefined,
  TQuery extends ContractSchema | undefined = ContractSchema | undefined,
  TBody extends ContractSchema | undefined = ContractSchema | undefined,
  TResponse extends ContractSchema | undefined = ContractSchema | undefined,
  TMeta extends ContractSchema | undefined = ContractSchema | undefined,
> {
  method: HttpMethod;
  path: string;
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  response?: TResponse;
  meta?: TMeta;
  status: HttpSuccessStatus;
  /** Most Luraba endpoints use the standard success envelope. Health is a raw operational probe. */
  responseEnvelope?: "standard" | "raw";
}

export function defineEndpoint<const TEndpoint extends EndpointContract>(
  endpoint: TEndpoint,
): TEndpoint {
  return endpoint;
}

export type EndpointParams<T extends EndpointContract> = T extends {
  params: infer TSchema extends ContractSchema;
}
  ? z.input<TSchema>
  : never;
export type EndpointQuery<T extends EndpointContract> = T extends {
  query: infer TSchema extends ContractSchema;
}
  ? z.input<TSchema>
  : never;
export type EndpointBody<T extends EndpointContract> = T extends {
  body: infer TSchema extends ContractSchema;
}
  ? z.input<TSchema>
  : never;
export type EndpointResponse<T extends EndpointContract> = T extends {
  response: infer TSchema extends ContractSchema;
}
  ? z.output<TSchema>
  : undefined;
export type EndpointMeta<T extends EndpointContract> = T extends {
  meta: infer TSchema extends ContractSchema;
}
  ? z.output<TSchema>
  : undefined;
export type EndpointResult<T extends EndpointContract> = T extends { meta: ContractSchema }
  ? { data: EndpointResponse<T>; meta: EndpointMeta<T> }
  : EndpointResponse<T>;

const PATH_PARAMETER_PATTERN = /:([A-Za-z][A-Za-z0-9_]*)/g;

export function buildEndpointPath(
  endpoint: Pick<EndpointContract, "path">,
  params?: Readonly<Record<string, string | number>>,
): string {
  const used = new Set<string>();
  const path = endpoint.path.replace(PATH_PARAMETER_PATTERN, (_, key: string) => {
    const value = params?.[key];
    if (value === undefined) throw new Error(`Missing endpoint path parameter: ${key}`);
    used.add(key);
    return encodeURIComponent(String(value));
  });

  for (const key of Object.keys(params ?? {})) {
    if (!used.has(key)) throw new Error(`Unexpected endpoint path parameter: ${key}`);
  }

  return path;
}

export function getEndpointBasePath(endpoint: Pick<EndpointContract, "path">): string {
  const firstSegment = endpoint.path.split("/").filter(Boolean)[0];
  if (!firstSegment) throw new Error(`Endpoint path has no base segment: ${endpoint.path}`);
  return `/${firstSegment}`;
}

export function getEndpointRouterPath(
  endpoint: Pick<EndpointContract, "path">,
  basePath = getEndpointBasePath(endpoint),
): string {
  if (endpoint.path !== basePath && !endpoint.path.startsWith(`${basePath}/`)) {
    throw new Error(`Endpoint path ${endpoint.path} is not within ${basePath}`);
  }
  return endpoint.path.slice(basePath.length) || "/";
}

export function parseEndpointResponse<T extends EndpointContract>(
  endpoint: T,
  value: unknown,
): EndpointResponse<T> {
  if (endpoint.status === 204) return undefined as EndpointResponse<T>;
  if (!endpoint.response)
    throw new Error(`Endpoint ${endpoint.method} ${endpoint.path} has no response schema`);
  return endpoint.response.parse(value) as EndpointResponse<T>;
}
