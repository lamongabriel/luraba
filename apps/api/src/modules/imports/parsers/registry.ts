import { interCheckingCsvAdapter } from "./adapters/inter-csv.js";
import { nubankCardCsvAdapter, nubankCheckingCsvAdapter } from "./adapters/nubank-csv.js";
import { ofxAdapter } from "./adapters/ofx.js";
import type { ImportFile, ParserAdapter } from "./types.js";

/**
 * The parser registry. Adding a format means writing one `ParserAdapter` and listing it here;
 * nothing downstream (staging, mapping, importers) changes. A PDF adapter would plug in the same
 * way once a text extractor is available (see ../README.md).
 */
export const parserAdapters: readonly ParserAdapter[] = [
  ofxAdapter,
  nubankCheckingCsvAdapter,
  nubankCardCsvAdapter,
  interCheckingCsvAdapter,
];

const MIN_SCORE = 0.3;

export function getParser(id: string): ParserAdapter | undefined {
  return parserAdapters.find((adapter) => adapter.id === id);
}

/** The best matching adapter for a file, or undefined when none recognizes it. */
export function detectParser(file: ImportFile): ParserAdapter | undefined {
  let best: { adapter: ParserAdapter; score: number } | undefined;
  for (const adapter of parserAdapters) {
    const score = adapter.detect(file);
    if (score >= MIN_SCORE && (!best || score > best.score)) best = { adapter, score };
  }
  return best?.adapter;
}
