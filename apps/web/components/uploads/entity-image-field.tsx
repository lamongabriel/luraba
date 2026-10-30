"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useCreateAttachmentMutation,
  useDeleteUploadMutation,
  useUploadFileMutation,
} from "@/mutations/uploads/use-upload-mutations";
import { useUploadConfigQuery } from "@/queries/uploads/use-uploads-query";

/**
 * Upload / replace / remove one picture on a record (an account photo, a merchant logo).
 * Uploads to the household, attaches it to the record (`targetType` + `role` from the attachment
 * registry), then calls `onChange` so the caller can point the record's field at the upload.
 * Removing calls `onChange(null)` and deletes the old file.
 */
export function EntityImageField({
  targetType,
  targetId,
  attachmentRole = "image",
  uploadId,
  preview,
  noun = "picture",
  onChange,
}: {
  targetType: "account" | "merchant" | "product";
  targetId: string;
  attachmentRole?: string;
  uploadId: string | null;
  /** The current look of the record, e.g. `<AccountMark />`. */
  preview: React.ReactNode;
  noun?: string;
  onChange: (uploadId: string | null) => Promise<unknown>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const config = useUploadConfigQuery();
  const upload = useUploadFileMutation();
  const attach = useCreateAttachmentMutation();
  const remove = useDeleteUploadMutation();
  const [saving, setSaving] = React.useState(false);
  const busy = saving || upload.isPending || attach.isPending || remove.isPending;

  if (config.data && !config.data.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        File storage isn't configured on this server, so a {noun} can't be uploaded.
      </p>
    );
  }

  async function pick(file: File) {
    setSaving(true);
    try {
      const created = await upload.mutateAsync({ file, scope: "household", filename: file.name });
      await attach.mutateAsync({
        uploadId: created.id,
        targetType,
        targetId,
        role: attachmentRole,
      });
      await onChange(created.id);
      toast.success(`${noun[0]?.toUpperCase()}${noun.slice(1)} updated`);
    } catch {
      // The mutations already toasted the failure.
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await onChange(null);
      if (uploadId) await remove.mutateAsync({ id: uploadId, force: true });
    } catch {
      // The mutations already toasted the failure.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview}
      <div className="space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {uploadId ? `Replace ${noun}` : `Upload ${noun}`}
        </Button>
        {uploadId ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={clear}>
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void pick(file);
        }}
      />
    </div>
  );
}
