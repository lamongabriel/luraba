"use client";

import type { Tag } from "@luraba/contracts";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
import { TAG_COLOR_PRESETS, TAG_ICONS } from "@/lib/tags";

import { useCreateEditTagForm } from "./use-create-edit-tag-form";

export function CreateEditTagForm({
  tag,
  onCancel,
  onSuccess,
}: {
  tag?: Tag;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { form, onSubmit, isEdit, isPending, errorMessage } = useCreateEditTagForm({
    tag,
    onSuccess,
  });

  const color = form.watch("color");
  const icon = form.watch("icon");
  const name = form.watch("name");

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-input/10 p-3">
        <Icon name={icon} color={color} variant="chip" size="md" />
        <div className="min-w-0">
          <Typography variant="small-strong" className="truncate">
            {name.trim() || "New tag"}
          </Typography>
        </div>
      </div>

      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Vacation"
        disabled={isPending}
      />

      <FormItem
        type="colorSwatches"
        control={form.control}
        name="color"
        label="Color"
        presets={TAG_COLOR_PRESETS}
        disabled={isPending}
      />

      <FormItem
        type="icon"
        control={form.control}
        name="icon"
        label="Icon"
        icons={TAG_ICONS}
        tintColor={color}
        disabled={isPending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating..."}
        >
          {isEdit ? "Save changes" : "Create tag"}
        </Button>
      </div>
    </form>
  );
}
