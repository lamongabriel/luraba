"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { updateBrandfetchBodySchema } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useUpdateBrandfetchIntegrationMutation } from "@/mutations/integrations/use-integration-mutations";
import { integrationQueryKeys } from "@/queries/integrations/use-integrations-query";

type FormValues = z.input<typeof updateBrandfetchBodySchema>;

/**
 * Brandfetch credentials. The client ID is never shown again after saving: the field is masked while
 * typing and a connected integration only offers Replace. Saving verifies the ID with Brandfetch.
 */
export function BrandfetchForm({ connected, onDone }: { connected: boolean; onDone?: () => void }) {
  const client = useQueryClient();
  const form = useForm<FormValues>({
    defaultValues: { clientId: "" },
    resolver: zodResolver(updateBrandfetchBodySchema),
  });
  const mutation = useUpdateBrandfetchIntegrationMutation({
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: integrationQueryKeys.all });
      form.reset({ clientId: "" });
      toast.success("Brandfetch connected");
      onDone?.();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.reset();
    mutation.mutate({ clientId: values.clientId.trim() });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="clientId"
        label={connected ? "New client ID" : "Client ID"}
        placeholder="Paste your Brandfetch client ID"
        description="Stored encrypted. It is never shown again."
        inputType="password"
        autoComplete="off"
        disabled={mutation.isPending}
      />
      {mutation.errorMessage ? (
        <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" isLoading={mutation.isPending} loadingText="Verifying...">
          {connected ? "Replace and verify" : "Verify and save"}
        </Button>
        {connected && onDone ? (
          <Button type="button" variant="ghost" onClick={onDone} disabled={mutation.isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
