export function tryParseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return undefined;
    }
  }
}
