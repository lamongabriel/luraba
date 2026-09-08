"use client";

import {
  Add01Icon,
  Calendar03Icon,
  Edit02Icon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RecurringBill } from "@luraba/contracts";
import { PERMISSIONS } from "@luraba/contracts";
import { endOfMonth, formatDatePattern as format, now, startOfMonth } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useCan } from "@/components/permissions/use-can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateRecurringBillMutation,
  useCreateRecurringOccurrenceMutation,
  useRescheduleRecurringOccurrenceMutation,
  useSkipRecurringOccurrenceMutation,
  useUpdateRecurringBillMutation,
} from "@/mutations/recurring-bills/use-recurring-bill-mutations";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { usePaymentMethodsQuery } from "@/queries/payment-methods/use-payment-methods-query";
import {
  recurringBillQueryKeys,
  useRecurringBillsQuery,
  useRecurringOccurrencesQuery,
} from "@/queries/recurring-bills/use-recurring-bills-query";

type BillType = "expense" | "income";
type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
type Status = "active" | "paused" | "archived";

const frequencies: Frequency[] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

export function RecurringBillsWorkspace() {
  const client = useQueryClient();
  const canCreate = useCan()(PERMISSIONS.RECURRING_BILLS_CREATE);
  const canUpdate = useCan()(PERMISSIONS.RECURRING_BILLS_UPDATE);
  const canDelete = useCan()(PERMISSIONS.RECURRING_BILLS_DELETE);
  const query = useRecurringBillsQuery({
    perPage: 100,
    sort: "startDate",
    sortDirection: "asc",
  });
  const accounts = useAccountsQuery({ perPage: 100 });
  const methods = usePaymentMethodsQuery({ perPage: 100 });
  const [status, setStatus] = useState<Status>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<BillType>("expense");
  const [accountId, setAccountId] = useState("");
  const [paymentMethodCode, setPaymentMethodCode] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(format(now(), "yyyy-MM-dd"));
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [rescheduleDates, setRescheduleDates] = useState<Record<string, string>>({});

  const invalidate = () => client.invalidateQueries({ queryKey: recurringBillQueryKeys.all });
  const create = useCreateRecurringBillMutation({
    onSuccess: () => {
      setDialogOpen(false);
      invalidate();
    },
  });
  const update = useUpdateRecurringBillMutation({
    onSuccess: () => {
      setDialogOpen(false);
      invalidate();
    },
  });
  const createOccurrence = useCreateRecurringOccurrenceMutation({
    onSuccess: invalidate,
  });
  const skipOccurrence = useSkipRecurringOccurrenceMutation({
    onSuccess: invalidate,
  });
  const rescheduleOccurrence = useRescheduleRecurringOccurrenceMutation({
    onSuccess: invalidate,
  });

  const rows = query.data?.data.filter((row) => row.status === status) ?? [];
  const selectedAccount = accounts.data?.data.find((account) => account.id === accountId);

  useEffect(() => {
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
    }
  }, [rows, selectedId]);

  const forecast = useRecurringOccurrencesQuery(selectedId ?? "", {
    from: format(startOfMonth(now()), "yyyy-MM-dd"),
    to: format(endOfMonth(now()), "yyyy-MM-dd"),
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setType("expense");
    setAccountId("");
    setPaymentMethodCode("");
    setAmount("");
    setStartDate(format(now(), "yyyy-MM-dd"));
    setFrequency("monthly");
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(row: RecurringBill) {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? "");
    setType(row.type);
    setAccountId(row.accountId);
    setPaymentMethodCode("");
    setAmount(String(row.amount / 100));
    setStartDate(row.startDate);
    setFrequency(row.frequency);
    setSelectedId(row.id);
    setDialogOpen(true);
  }

  function submit() {
    if (
      !selectedAccount ||
      !name.trim() ||
      (!editingId && !paymentMethodCode) ||
      Number(amount) <= 0
    )
      return;
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      accountId: selectedAccount.id,
      paymentMethodCode: paymentMethodCode || undefined,
      amount: Math.round(Number(amount) * 100),
      currencyCode: selectedAccount.currencyCode,
      startDate,
      frequency,
    };
    if (editingId) update.mutate({ id: editingId, body });
    else create.mutate(body);
  }

  if (query.isLoading || accounts.isLoading || methods.isLoading) {
    return (
      <div className="grid gap-3">
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load recurring bills"
        description={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border/70 p-1">
          {(["active", "paused", "archived"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? "secondary" : "ghost"}
              onClick={() => setStatus(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <HugeiconsIcon icon={Add01Icon} /> Add recurring bill
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${status} recurring rules`}
          description="Recurring income and expenses will appear here."
          action={canCreate ? <Button onClick={openCreate}>Create a rule</Button> : null}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardContent className="divide-y divide-border/70 p-0">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 ${selectedId === row.id ? "bg-muted/50" : ""}`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      <HugeiconsIcon icon={row.status === "active" ? PlayIcon : PauseIcon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.type} · {row.frequency} · {row.currencyCode} {row.amount / 100}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    {canUpdate ? (
                      <>
                        <Button
                          aria-label={`Edit ${row.name}`}
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => openEdit(row)}
                        >
                          <HugeiconsIcon icon={Edit02Icon} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            update.mutate({
                              id: row.id,
                              body: {
                                status: row.status === "active" ? "paused" : "active",
                              },
                            })
                          }
                        >
                          {row.status === "active" ? "Pause" : "Resume"}
                        </Button>
                      </>
                    ) : null}
                    {canDelete && row.status !== "archived" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update.mutate({
                            id: row.id,
                            body: { status: "archived" },
                          })
                        }
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={Calendar03Icon} /> Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {forecast.data?.length ? (
                forecast.data.slice(0, 5).map((occurrence) => {
                  const date = rescheduleDates[occurrence.id] ?? occurrence.effectiveDate;
                  return (
                    <div key={occurrence.id} className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{occurrence.effectiveDate}</span>
                        <span className="text-muted-foreground">{occurrence.status}</span>
                      </div>
                      {occurrence.status === "scheduled" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {canCreate ? (
                            <Button
                              size="xs"
                              onClick={() =>
                                createOccurrence.mutate({
                                  id: occurrence.recurringBillId,
                                  date: occurrence.occurrenceDate,
                                })
                              }
                            >
                              Create
                            </Button>
                          ) : null}
                          {canUpdate ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                skipOccurrence.mutate({
                                  id: occurrence.recurringBillId,
                                  date: occurrence.occurrenceDate,
                                })
                              }
                            >
                              Skip
                            </Button>
                          ) : null}
                          {canUpdate ? (
                            <Input
                              aria-label={`Reschedule ${occurrence.occurrenceDate}`}
                              className="h-7 w-32"
                              type="date"
                              value={date}
                              onChange={(event) =>
                                setRescheduleDates((current) => ({
                                  ...current,
                                  [occurrence.id]: event.target.value,
                                }))
                              }
                              onBlur={() =>
                                date !== occurrence.effectiveDate &&
                                rescheduleOccurrence.mutate({
                                  id: occurrence.recurringBillId,
                                  date: occurrence.occurrenceDate,
                                  nextDate: date,
                                })
                              }
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground">Select a rule to see its forecast.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit recurring rule" : "New recurring rule"}</DialogTitle>
            <DialogDescription>
              Forecasts stay virtual until you create an occurrence.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurring-name">Name</Label>
              <Input
                id="recurring-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Rent, salary, internet..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-description">Description</Label>
              <Input
                id="recurring-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as BillType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(value) => setFrequency(value as Frequency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.data?.data.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} · {account.currencyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethodCode} onValueChange={setPaymentMethodCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {methods.data?.data.map((method) => (
                    <SelectItem key={method.id} value={method.code}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="recurring-amount">Amount</Label>
                <Input
                  id="recurring-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurring-start">Start date</Label>
                <Input
                  id="recurring-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={create.isPending || update.isPending} onClick={submit}>
              {editingId ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
