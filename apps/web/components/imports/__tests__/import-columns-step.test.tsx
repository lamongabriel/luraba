import type { ImportBatch, ImportColumnMapping, ImportFilePreview } from "@luraba/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ColumnsStep } from "@/components/imports/import-columns-step";
import { ImportRawTable } from "@/components/imports/import-raw-table";

const mutate = vi.fn();
let preview: ImportFilePreview;

vi.mock("@/queries/imports/use-imports-query", () => ({
  useImportPreviewQuery: () => ({
    data: preview,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/mutations/imports/use-import-mutations", () => ({
  useSaveImportColumnsMutation: () => ({ mutate, isPending: false }),
}));

const mapping = (columns: ImportColumnMapping["columns"]): ImportColumnMapping => ({
  columns,
  dateFormat: "MM/DD/YYYY",
  decimalSeparator: ".",
  amountSign: "negative_is_out",
  outflowValues: [],
  installmentsFromDescription: false,
});

const batch = { id: "batch-1", format: "table" } as ImportBatch;

function makePreview(suggestion: ImportColumnMapping): ImportFilePreview {
  return {
    headers: ["Data", "Descricao", "Valor"],
    rows: [["10/28/2026", "STARBUCKS #123", "-4.50"]],
    totalRows: 1,
    columnValues: {},
    suggestion,
    suggestionSource: "aliases",
  };
}

describe("ColumnsStep", () => {
  beforeEach(() => mutate.mockClear());

  it("blocks Next until every required field is mapped", () => {
    preview = makePreview(mapping({ date: "Data" }));
    render(<ColumnsStep batch={batch} onBack={() => undefined} onNext={() => undefined} />);

    expect(screen.getByText("Map: Description, Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next: map values" })).toBeDisabled();
  });

  it("sends the pre-filled mapping and remembers the layout by default", async () => {
    const onNext = vi.fn();
    preview = makePreview(mapping({ date: "Data", description: "Descricao", amount: "Valor" }));
    render(<ColumnsStep batch={batch} onBack={() => undefined} onNext={onNext} />);

    expect(screen.getByText("Suggested from the column names. Check each one.")).toBeVisible();
    const next = screen.getByRole("button", { name: "Next: map values" });
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(mutate).toHaveBeenCalledWith(
      {
        id: "batch-1",
        body: {
          mapping: preview.suggestion,
          saveTemplate: true,
        },
      },
      expect.objectContaining({ onSuccess: onNext }),
    );
  });
});

describe("ImportRawTable", () => {
  it("shows the file as written and labels mapped columns", () => {
    render(
      <ImportRawTable
        headers={["Data", "Valor"]}
        rows={[["10/28/2026", "-4.50"]]}
        highlight={{ Valor: "Amount" }}
      />,
    );
    expect(screen.getByText("-4.50")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });
});
