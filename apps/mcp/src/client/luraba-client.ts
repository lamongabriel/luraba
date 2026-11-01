import {
  type ApiFailureResponse,
  apiFailureResponseSchema,
  apiSuccessResponseSchema,
  buildEndpointPath,
  type ContractSchema,
  type EndpointBody,
  type EndpointContract,
  type EndpointMeta,
  type EndpointParams,
  type EndpointQuery,
  type EndpointResponse,
} from "@luraba/contracts/api";
import { LurabaApiError } from "./errors.js";

type Result<T extends EndpointContract> = T extends { meta: ContractSchema }
  ? { data: EndpointResponse<T>; meta: EndpointMeta<T> }
  : EndpointResponse<T>;

export type RequestOptions<T extends EndpointContract> = {
  params?: EndpointParams<T>;
  query?: EndpointQuery<T>;
  body?: EndpointBody<T>;
  /** Overrides the client's default household for this call. */
  householdId?: string;
};

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type LurabaClientOptions = {
  baseUrl: string;
  apiKey: string;
  householdId?: string | undefined;
  timeoutMs?: number;
  fetch?: FetchLike;
};

function serializeQuery(query: object): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(","));
      continue;
    }
    search.set(key, value instanceof Date ? value.toISOString() : String(value));
  }
  return search;
}

/**
 * A thin client of the Luraba REST API built on the contract definitions in `@luraba/contracts`:
 * requests are validated with the contract's own schemas before they are sent and responses are
 * parsed with the contract's response schemas, so the MCP tools cannot drift from the API. The key
 * is sent as a Bearer token; the API enforces the owner's household permissions.
 */
export class LurabaClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: FetchLike;
  readonly householdId: string | undefined;

  constructor(options: LurabaClientOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = `${options.baseUrl.replace(/\/+$/u, "")}/api/v1`;
    this.#timeoutMs = options.timeoutMs ?? 30_000;
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init));
    this.householdId = options.householdId;
  }

  async request<T extends EndpointContract>(
    endpoint: T,
    options: RequestOptions<T> = {},
  ): Promise<Result<T>> {
    const params = endpoint.params?.parse(options.params);
    const path = buildEndpointPath(endpoint, params as Record<string, string | number> | undefined);
    const query = endpoint.query
      ? serializeQuery(endpoint.query.parse(options.query ?? {}) as object)
      : null;
    const url = `${this.#baseUrl}${path}${query && query.size > 0 ? `?${query.toString()}` : ""}`;
    const householdId = options.householdId ?? this.householdId;
    const body = endpoint.body ? endpoint.body.parse(options.body) : undefined;

    let response: Response;
    try {
      response = await this.#fetch(url, {
        method: endpoint.method.toUpperCase(),
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(householdId ? { "X-Household-Id": householdId } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new LurabaApiError(
        timedOut
          ? "The Luraba API did not answer in time"
          : "Could not reach the Luraba API. Check LURABA_API_URL and that the API is running",
        503,
        "UNREACHABLE",
      );
    }

    if (endpoint.status === 204 && response.ok) return undefined as Result<T>;

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const failure = apiFailureResponseSchema.safeParse(payload);
      const error: ApiFailureResponse["error"] = failure.success
        ? failure.data.error
        : { code: "HTTP_ERROR", message: `HTTP ${response.status}` };
      throw new LurabaApiError(error.message, response.status, error.code);
    }

    if (!endpoint.response) return undefined as Result<T>;
    const envelope = apiSuccessResponseSchema(endpoint.response).safeParse(payload);
    if (!envelope.success) {
      throw new LurabaApiError(
        `The API response did not match ${endpoint.method.toUpperCase()} ${endpoint.path}`,
        502,
        "INVALID_API_RESPONSE",
      );
    }
    if (!endpoint.meta) return envelope.data.data as Result<T>;
    const meta = endpoint.meta.safeParse(envelope.data.meta);
    if (!meta.success) {
      throw new LurabaApiError(
        `The API metadata did not match ${endpoint.method.toUpperCase()} ${endpoint.path}`,
        502,
        "INVALID_API_RESPONSE",
      );
    }
    return { data: envelope.data.data, meta: meta.data } as Result<T>;
  }
}
