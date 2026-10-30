"use client";

import type { PermissionInput } from "@luraba/contracts";
import * as React from "react";
import { toast } from "sonner";
import { useCan } from "@/components/permissions/use-can";
import { Button } from "@/components/ui/button";
import { ClickToUpload } from "@/components/uploads/click-to-upload";
import { ImageCropperDialog } from "@/components/uploads/image-cropper-dialog";
import {
  useCreateAttachmentMutation,
  useDeleteUploadMutation,
  useUploadFileMutation,
} from "@/mutations/uploads/use-upload-mutations";
import { useUploadConfigQuery } from "@/queries/uploads/use-uploads-query";

/**
 * Change one picture on a record by clicking it (`ClickToUpload`), or remove it (an account photo, a merchant logo).
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
  children,
  noun = "picture",
  permission,
  onChange,
}: {
  targetType: "account" | "merchant" | "product" | "household";
  targetId: string;
  attachmentRole?: string;
  uploadId: string | null;
  /** The current look of the record, e.g. `<AccountMark />`. */
  preview: React.ReactNode;
  /** Shown beside the picture, e.g. the record's name. */
  children?: React.ReactNode;
  noun?: string;
  /** Needed to change the picture; without it the picture is shown but not clickable. */
  permission?: PermissionInput;
  onChange: (uploadId: string | null) => Promise<unknown>;
}) {
  const can = useCan();
  const config = useUploadConfigQuery();
  const upload = useUploadFileMutation();
  const attach = useCreateAttachmentMutation();
  const remove = useDeleteUploadMutation();
  const [saving, setSaving] = React.useState(false);
  const [picked, setPicked] = React.useState<File | null>(null);
  const busy = saving || upload.isPending || attach.isPending || remove.isPending;

  if (permission && !can(permission)) {
    return (
      <div className="flex items-center gap-4">
        {preview}
        {children}
      </div>
    );
  }

  if (config.data && !config.data.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        File storage isn't configured on this server, so a {noun} can't be uploaded.
      </p>
    );
  }

  async function pick(blob: Blob) {
    setSaving(true);
    try {
      const created = await upload.mutateAsync({
        file: blob,
        scope: "household",
        filename: "picture.webp",
      });
      await attach.mutateAsync({
        uploadId: created.id,
        targetType,
        targetId,
        role: attachmentRole,
      });
      await onChange(created.id);
      setPicked(null);
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
      <ClickToUpload
        busy={busy}
        label={uploadId ? `Replace ${noun}` : `Upload ${noun}`}
        onFile={setPicked}
      >
        {preview}
      </ClickToUpload>
      {children}
      {uploadId ? (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={clear}>
          Remove
        </Button>
      ) : null}
      <ImageCropperDialog
        file={picked}
        shape="square"
        title={`Crop ${noun}`}
        confirmLabel={`Use ${noun}`}
        onCancel={() => setPicked(null)}
        onCropped={(blob) => void pick(blob)}
        isSaving={busy}
      />
    </div>
  );
}
