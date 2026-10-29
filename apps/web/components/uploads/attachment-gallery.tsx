"use client";

import { Delete02Icon, Download01Icon, File01Icon, Upload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Attachment } from "@luraba/contracts";
import * as React from "react";
import { toast } from "sonner";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, uploadContentUrl } from "@/lib/uploads";
import {
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
  useUploadFileMutation,
} from "@/mutations/uploads/use-upload-mutations";
import { useAttachmentsQuery, useUploadConfigQuery } from "@/queries/uploads/use-uploads-query";

type AttachmentTarget = Parameters<typeof useAttachmentsQuery>[0]["targetType"];

/**
 * Lists the files attached to one record in one role, and lets the user add or remove them.
 * Reuse it anywhere a record can hold files: pass the target and the role from the contracts'
 * ATTACHMENT_TARGETS registry (apps/web/components/uploads/README.md).
 */
export function AttachmentGallery({
  targetType,
  targetId,
  attachmentRole,
  accept = "image/*,application/pdf",
  addLabel = "Add file",
  emptyLabel = "No files attached yet.",
}: {
  targetType: AttachmentTarget;
  targetId: string;
  attachmentRole: string;
  /** The file picker's `accept` filter; the API still validates the real file type. */
  accept?: string;
  addLabel?: string;
  emptyLabel?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const config = useUploadConfigQuery();
  const attachments = useAttachmentsQuery({
    targetType,
    targetIds: targetId,
    role: attachmentRole,
  });
  const upload = useUploadFileMutation();
  const attach = useCreateAttachmentMutation();
  const detach = useDeleteAttachmentMutation();
  const busy = upload.isPending || attach.isPending;

  if (config.data && !config.data.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        File storage isn't configured on this server, so files can't be attached.
      </p>
    );
  }

  async function addFiles(files: FileList | null) {
    const picked = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = "";

    for (const file of picked) {
      try {
        const created = await upload.mutateAsync({ file, scope: "household" });
        await attach.mutateAsync({
          uploadId: created.id,
          targetType,
          targetId,
          role: attachmentRole,
        });
      } catch {
        // The mutation toasts the error; keep going so one bad file doesn't drop the rest.
      }
    }
    if (picked.length > 0) toast.success(picked.length === 1 ? "File attached" : "Files attached");
  }

  return (
    <div className="space-y-3">
      {attachments.isLoading ? <Skeleton className="h-14" /> : null}
      {attachments.data?.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : null}
      <ul className="space-y-2">
        {attachments.data?.map((attachment) => (
          <AttachmentRow
            key={attachment.id}
            attachment={attachment}
            removing={detach.isPending && detach.variables === attachment.id}
            onRemove={() => detach.mutate(attachment.id)}
          />
        ))}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(event) => addFiles(event.target.files)}
      />
      <PermissionButton
        permission={PERMISSIONS.UPLOADS_CREATE}
        variant="outline"
        size="sm"
        isLoading={busy}
        onClick={() => inputRef.current?.click()}
      >
        <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
        {addLabel}
      </PermissionButton>
    </div>
  );
}

function AttachmentRow({
  attachment,
  onRemove,
  removing,
}: {
  attachment: Attachment;
  onRemove: () => void;
  removing: boolean;
}) {
  const { upload } = attachment;
  const isImage = upload.kind === "image";

  return (
    <li className="flex items-center gap-3 rounded-lg border p-2">
      <a
        href={uploadContentUrl(upload.id)}
        target="_blank"
        rel="noreferrer"
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
        aria-label={`Open ${upload.filename}`}
      >
        {isImage ? (
          // biome-ignore lint/performance/noImgElement: served by the API with the session cookie
          <img
            src={uploadContentUrl(upload.id)}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <HugeiconsIcon icon={File01Icon} strokeWidth={1.5} className="size-5" />
        )}
      </a>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{upload.filename}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(upload.sizeBytes)}</p>
      </div>
      <Button variant="ghost" size="icon-sm" asChild aria-label="Download">
        <a href={uploadContentUrl(upload.id, { download: true })}>
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        </a>
      </Button>
      <PermissionButton
        permission={PERMISSIONS.UPLOADS_CREATE}
        variant="ghost"
        size="icon-sm"
        isLoading={removing}
        onClick={onRemove}
        aria-label="Remove"
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
      </PermissionButton>
    </li>
  );
}
