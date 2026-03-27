"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/finance/forms/form-sheet";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
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
import type { CategoryHttp } from "@/interfaces/http/categories";
import { useAppMutation } from "@/lib/mutations";
import { createCategory } from "@/services/categories.service";

type CategoryFormValues = {
  name: string;
  type: "expense" | "income";
  parentId: string;
};

const NO_PARENT_VALUE = "__none__";

export function CategoryFormSheet({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryHttp[];
}) {
  const queryClient = useQueryClient();
  const resetValues = React.useMemo<CategoryFormValues>(
    () => ({
      name: "",
      type: "expense",
      parentId: NO_PARENT_VALUE,
    }),
    [],
  );
  const wasOpenRef = React.useRef(false);
  const form = useForm<CategoryFormValues>({
    defaultValues: resetValues,
  });

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      form.reset(resetValues);
    }
    wasOpenRef.current = open;
  }, [form, open, resetValues]);

  const type = form.watch("type");
  const parentOptions = categories.filter((category) => category.type === type);

  const mutation = useAppMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      ]);
      onOpenChange(false);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({
      name: values.name,
      type: values.type,
      parentId: values.parentId === NO_PARENT_VALUE ? undefined : values.parentId,
    });
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create category"
      description="Add a new income or expense category for budgets and transaction assignment."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="category-name">Category name</Label>
          <Input id="category-name" placeholder="Groceries" {...form.register("name")} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value: "expense" | "income") => form.setValue("type", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Parent category</Label>
            <Select value={form.watch("parentId")} onValueChange={(value) => form.setValue("parentId", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT_VALUE}>No parent</SelectItem>
                {parentOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <FormErrorBoundary error={mutation.error} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create category"}
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
