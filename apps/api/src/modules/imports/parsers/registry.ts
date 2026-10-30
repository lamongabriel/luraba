import { ofxAdapter } from "./adapters/ofx.js";
import type { ImportFile, ParserAdapter } from "./types.js";

/**
 * Formats with fixed fields (OFX). Tables (CSV, Excel) have no adapter: the user maps their columns
 * (`../imports.columns.ts`). Adding a fixed format means writing one `ParserAdapter` and listing it
 * here; nothing downstream (staging, mapping, importers) changes.
 */
export const parserAdapters: readonly ParserAdapter[] = [ofxAdapter];

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
