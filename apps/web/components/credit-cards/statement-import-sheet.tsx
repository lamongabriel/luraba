"use client";

import type {
  CardStatementInput,
  CardStatementLine,
  CardStatementResult,
  CreditCard,
} from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { AmountDisplay } from "@/components/display";
import { FormSheet } from "@/components/forms/form-sheet";
import { KpiStrip } from "@/components/kpi";
import { ListRow } from "@/components/lists/list-row";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";
import {
  useApplyCardStatementMutation,
  usePreviewCardStatementMutation,
} from "@/mutations/credit-cards/use-credit-card-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

/** How each statement line reads in the preview (the matching rules are in the credit-cards API README). */
export const STATEMENT_LINE_STATUS: Record<
  CardStatementLine["status"],
  { label: string; badge: string }
> = {
  matched: { label: "Matches", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  corrected: { label: "Cents fixed", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  review: { label: "Review", badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  missing: { label: "Not in Luraba", badge: "bg-red-500/15 text-red-700 dark:text-red-300" },
  netted: { label: "IOF netted", badge: "bg-muted text-muted-foreground" },
  payment: { label: "Payment", badge: "bg-muted text-muted-foreground" },
};

/** Statuses worth a row. Matches and netted lines stay out of the way, as counts. */
const ATTENTION_ORDER: CardStatementLine["status"][] = ["review", "missing", "corrected"];

const ISSUER_LABELS: Record<CardStatementResult["issuer"], string> = {
  nubank: "Nubank",
  inter: "Inter",
  xp: "XP",
  inter_global: "Inter Global",
  ofx: "OFX",
};

/**
 * Imports an issuer statement (CSV or OFX) for one invoice. Reading the file runs a preview that writes nothing:
 * it shows what matched, which cents will be fixed, what needs review and what is missing on either side. Apply
 * saves the corrections and, when the invoice then equals the issuer's total, reconciles and locks it.
 */
export function StatementImportSheet({
  open,
  onOpenChange,
  card,
  months,
  defaultMonth,
  language,
  precision,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCard;
  /** Invoice months (YYYY-MM) that can be imported, oldest first. */
  months: string[];
  defaultMonth: string;
  language: string;
  precision: number;
}) {
  const queryClient = useQueryClient();
  const [month, setMonth] = React.useState(defaultMonth);
  const [file, setFile] = React.useState<{ name: string; content: string } | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setMonth(defaultMonth);
    setFile(null);
    setReadError(null);
  }, [open, defaultMonth]);

  const preview = usePreviewCardStatementMutation({ successToast: false });
  const apply = useApplyCardStatementMutation({
    successToast: false,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      ]);
      onOpenChange(false);
      const { toast } = await import("sonner");
      toast.success(result.reconciled ? "Invoice reconciled" : "Statement applied", {
        description: result.reconciled
          ? "It now matches the issuer and is locked."
          : "Some differences still need your review.",
      });
    },
  });

  const body = React.useMemo<CardStatementInput | null>(
    () => (file ? { fileName: file.name, content: file.content, month } : null),
    [file, month],
  );
  const { mutate: runPreview, reset: resetPreview } = preview;

  React.useEffect(() => {
    if (!body) {
      resetPreview();
      return;
    }
    runPreview({ creditCardId: card.id, body });
  }, [body, card.id, runPreview, resetPreview]);

  const onFile = async (selected: File | undefined) => {
    setReadError(null);
    if (!selected) return setFile(null);
    try {
      setFile({ name: selected.name, content: await selected.text() });
    } catch {
      setFile(null);
      setReadError("We couldn't read this file.");
    }
  };

  const result = preview.data;
  const money = (amount: number) => (
    <AmountDisplay
      amount={amount}
      currencyCode={card.currencyCode}
      language={language}
      precision={precision}
      size="md"
      showSign={false}
    />
  );
  const attention = result
    ? ATTENTION_ORDER.flatMap((status) => result.lines.filter((line) => line.status === status))
    : [];

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Import statement"
      description={`Match ${card.name}'s invoice to the issuer's file. Nothing is saved until you apply.`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="statement-file">Statement file (CSV or OFX)</Label>
          <Input
            id="statement-file"
            type="file"
            accept=".csv,.ofx,.txt,text/csv"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          {readError ? <p className="text-sm text-destructive">{readError}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="statement-month">Invoice</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger id="statement-month" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((key) => (
                <SelectItem key={key} value={key}>
                  {formatMonthKeyLabel(key, language)} invoice
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {preview.isPending ? <StatementPreviewLoading /> : null}
      {preview.isError ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
          <Typography variant="subheading">We couldn't read this statement</Typography>
          <p className="text-sm text-muted-foreground">{preview.errorMessage}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => body && runPreview({ creditCardId: card.id, body })}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-5">
          <KpiStrip
            label="Statement comparison"
            items={[
              {
                label: `${ISSUER_LABELS[result.issuer]} total`,
                value: money(result.issuerTotal),
                hint: "From the file",
              },
              {
                label: "Luraba after fixes",
                value: money(result.lurabaTotalAfter),
                hint: result.reconciled
                  ? "Matches the issuer"
                  : result.remainingDifference > 0
                    ? "Luraba is higher"
                    : "Luraba is lower",
              },
            ]}
          />
          <p className="text-sm text-muted-foreground" data-testid="statement-summary">
            {result.summary.matched} matched · {result.summary.corrected} cents fixed ·{" "}
            {result.summary.review} to review · {result.summary.missing} not in Luraba ·{" "}
            {result.summary.extra} not on the statement
          </p>
          {result.warnings.map((warning) => (
            <p key={warning} className="text-sm text-orange-700 dark:text-orange-300">
              {warning}
            </p>
          ))}
          {attention.length > 0 || result.extra.length > 0 ? (
            <div>
              {attention.map((line) => (
                <ListRow
                  key={line.index}
                  title={line.description}
                  subtitle={
                    <>
                      {line.installment
                        ? `${line.installment.number}/${line.installment.total}`
                        : null}
                      {line.lurabaAmount !== null ? (
                        <>
                          {line.installment ? " · " : null}Luraba had {money(line.lurabaAmount)}
                        </>
                      ) : null}
                    </>
                  }
                  amount={money(line.amount)}
                  meta={
                    <Badge
                      className={cn(
                        "border-0 px-1.5 py-0 text-[0.65rem]",
                        STATEMENT_LINE_STATUS[line.status].badge,
                      )}
                    >
                      {STATEMENT_LINE_STATUS[line.status].label}
                    </Badge>
                  }
                />
              ))}
              {result.extra.map((item) => (
                <ListRow
                  key={item.installmentId}
                  title={item.description}
                  subtitle={`${item.installmentNumber}/${item.installmentCount}`}
                  amount={money(item.amount)}
                  meta={
                    <Badge className="border-0 bg-muted px-1.5 py-0 text-[0.65rem] text-muted-foreground">
                      Not on statement
                    </Badge>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Every line on the statement matches.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <PermissionButton
              permission={PERMISSIONS.TRANSACTIONS_UPDATE}
              deniedMessage="Your household role cannot change purchases."
              disabled={apply.isPending}
              onClick={() => body && apply.mutate({ creditCardId: card.id, body })}
            >
              {apply.isPending ? "Applying…" : "Apply statement"}
            </PermissionButton>
          </div>
          {apply.isError ? <p className="text-sm text-destructive">{apply.errorMessage}</p> : null}
        </div>
      ) : null}
    </FormSheet>
  );
}

/** Same blocks as the loaded preview: KPI strip, summary line and a few rows. */
function StatementPreviewLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="space-y-2">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
