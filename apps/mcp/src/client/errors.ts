export class LurabaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "LurabaApiError";
  }
}

/** A message safe and useful for an agent: says what happened and what to do about it. */
export function describeApiError(error: LurabaApiError): string {
  switch (error.status) {
    case 401:
      return "The Luraba API rejected the API key (invalid, revoked or expired). Create a new key in Settings > API keys.";
    case 403:
      return `Not allowed: ${error.message}. The API key has the same permissions as its owner in this household.`;
    case 404:
      return `Not found: ${error.message}`;
    case 429:
      return "Rate limit reached for this API key. Wait a few seconds and retry with fewer requests.";
    case 422:
      return `The API rejected the input: ${error.message}`;
    default:
      return `Luraba API error (${error.status} ${error.code}): ${error.message}`;
  }
}
