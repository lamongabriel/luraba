import type { Candidate, Resolution } from "./match.js";

export type Problem = {
  field: string;
  query: string;
  reason: "ambiguous" | "not_found";
  candidates: Candidate[];
  hint: string;
};

/** Collects the references an agent named that could not be resolved to exactly one record. */
export class Problems {
  readonly items: Problem[] = [];

  get any(): boolean {
    return this.items.length > 0;
  }

  /** Returns the id when the resolution is unique; otherwise records a problem and returns undefined. */
  take(field: string, resolution: Resolution): string | undefined {
    if (resolution.status === "resolved") return resolution.id;
    if (resolution.status === "ambiguous") {
      this.items.push({
        field,
        query: resolution.query,
        reason: "ambiguous",
        candidates: resolution.candidates,
        hint: `Several records match "${resolution.query}". Ask which one, then pass its id in ${field}.`,
      });
    } else {
      this.items.push({
        field,
        query: resolution.query,
        reason: "not_found",
        candidates: resolution.suggestions,
        hint:
          resolution.suggestions.length > 0
            ? `Nothing is named "${resolution.query}". Did you mean one of the candidates? Pass its id in ${field}.`
            : `Nothing is named "${resolution.query}". Check the name or list the available records first.`,
      });
    }
    return undefined;
  }
}

export function clarificationOutput(problems: Problems) {
  return {
    isError: false,
    summary: `Needs clarification: ${problems.items.map((p) => `${p.field} "${p.query}" (${p.reason})`).join(", ")}. Nothing was changed.`,
    data: { status: "needs_clarification" as const, problems: problems.items },
  };
}
