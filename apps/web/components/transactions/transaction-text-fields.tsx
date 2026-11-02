"use client";

import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { SidePanelDetailRow, SidePanelSection } from "@/components/side-panel/side-panel-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const NOTES_MAX_LENGTH = 4000;
const ORIGINAL_DESCRIPTION_MAX_LENGTH = 512;

type SaveText = (
  field: "notes" | "originalDescription",
  value: string | null,
  options: { onError: () => void },
) => void;

/**
 * The two free-text fields of a transaction in the details drawer: the free-form notes and the
 * statement name (the raw text the bank shows, read-only until you press the pencil). Empty text
 * is saved as `null`. For a card purchase the values belong to the purchase, so every installment
 * shows the same text.
 */
export function TransactionTextFields({
  disabled,
  notes,
  onSave,
  originalDescription,
  rowKey,
}: {
  disabled: boolean;
  notes: string | null;
  onSave: SaveText;
  originalDescription: string | null;
  rowKey: string;
}) {
  const [notesDraft, setNotesDraft] = React.useState(notes ?? "");
  const [statementDraft, setStatementDraft] = React.useState(originalDescription ?? "");
  const [editingStatement, setEditingStatement] = React.useState(false);

  React.useEffect(() => {
    setNotesDraft(notes ?? "");
  }, [notes]);

  React.useEffect(() => {
    setStatementDraft(originalDescription ?? "");
    setEditingStatement(false);
  }, [originalDescription]);

  const saveNotes = () => {
    const next = notesDraft.trim() === "" ? null : notesDraft.trim();
    if (next === (notes ?? null)) {
      setNotesDraft(notes ?? "");
      return;
    }
    onSave("notes", next, { onError: () => setNotesDraft(notes ?? "") });
  };

  const saveStatement = () => {
    setEditingStatement(false);
    const next = statementDraft.trim() === "" ? null : statementDraft.trim();
    if (next === (originalDescription ?? null)) {
      setStatementDraft(originalDescription ?? "");
      return;
    }
    onSave("originalDescription", next, {
      onError: () => setStatementDraft(originalDescription ?? ""),
    });
  };

  return (
    <>
      <SidePanelSection title="Statement name">
        <SidePanelDetailRow label="As the bank shows it">
          {editingStatement ? (
            <Input
              autoFocus
              aria-label="Statement name"
              value={statementDraft}
              maxLength={ORIGINAL_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => setStatementDraft(event.target.value)}
              onBlur={saveStatement}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setStatementDraft(originalDescription ?? "");
                  setEditingStatement(false);
                }
              }}
              className="h-7 text-right text-xs"
            />
          ) : (
            <span className="flex items-start justify-end gap-1.5">
              <span
                className={`break-words ${originalDescription ? "" : "font-normal text-muted-foreground"}`}
              >
                {originalDescription ?? "Not saved"}
              </span>
              {disabled ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Edit statement name"
                  onClick={() => setEditingStatement(true)}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                </Button>
              )}
            </span>
          )}
        </SidePanelDetailRow>
      </SidePanelSection>

      <SidePanelSection title="Notes">
        <Textarea
          id={`transaction-notes-${rowKey}`}
          aria-label="Notes"
          value={notesDraft}
          maxLength={NOTES_MAX_LENGTH}
          disabled={disabled}
          placeholder="Add a note: what you bought, who it was for, a gift card used..."
          onChange={(event) => setNotesDraft(event.target.value)}
          onBlur={saveNotes}
          className="min-h-20"
        />
      </SidePanelSection>
    </>
  );
}
