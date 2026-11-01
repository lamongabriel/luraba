"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { API_KEY_NAME_MAX_LENGTH, type CreatedApiKey } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormItem } from "@/components/forms/form-item";
import { FormSheet } from "@/components/forms/form-sheet";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { expiryDateToDays } from "@/lib/api-keys";
import { useCreateApiKeyMutation } from "@/mutations/api-keys/use-api-key-mutations";
import { apiKeyQueryKeys } from "@/queries/api-keys/use-api-keys-query";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a label.")
    .max(API_KEY_NAME_MAX_LENGTH, "Label is too long."),
  expiresOn: z
    .string()
    .refine((value) => !value || value > todayISODate(), "Pick a date in the future."),
});
type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { name: "", expiresOn: "" };

export function CreateApiKeySheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: CreatedApiKey) => void;
}) {
  const client = useQueryClient();
  const form = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(schema),
  });
  const mutation = useCreateApiKeyMutation({
    onSuccess: async (key) => {
      await client.invalidateQueries({ queryKey: apiKeyQueryKeys.lists() });
      form.reset(DEFAULT_VALUES);
      onCreated(key);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.reset();
    mutation.mutate({
      name: values.name.trim(),
      expiresInDays: expiryDateToDays(values.expiresOn),
    });
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create API key"
      description="A key acts as you, with your role in each household. Revoke it any time."
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <FormItem
          control={form.control}
          name="name"
          label="Label"
          placeholder="Claude Code on my laptop"
          description="Helps you recognize the key later."
          disabled={mutation.isPending}
        />
        <FormItem
          control={form.control}
          name="expiresOn"
          label="Expires on (optional)"
          inputType="date"
          description="Leave empty for a key that never expires."
          disabled={mutation.isPending}
        />
        {mutation.errorMessage ? (
          <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
        ) : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} loadingText="Creating...">
            Create key
          </Button>
        </div>
      </form>
    </FormSheet>
  );
}
