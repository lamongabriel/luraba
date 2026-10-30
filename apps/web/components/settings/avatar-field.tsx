"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ClickToUpload } from "@/components/uploads/click-to-upload";
import { ImageCropperDialog } from "@/components/uploads/image-cropper-dialog";
import { uploadContentUrl } from "@/lib/uploads";
import { useUpdateProfileMutation } from "@/mutations/settings/use-settings-mutations";
import {
  useCreateAttachmentMutation,
  useDeleteUploadMutation,
  useUploadFileMutation,
} from "@/mutations/uploads/use-upload-mutations";
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query";
import { useUploadConfigQuery, useUploadsQuery } from "@/queries/uploads/use-uploads-query";

/**
 * The profile picture: pick a photo, crop it, and keep every earlier photo in a personal
 * library so any of them can be chosen again or deleted to free space.
 */
export function AvatarField({
  userId,
  name,
  image,
  children,
}: {
  userId: string;
  name: string;
  image: string | null;
  /** Shown beside the photo, e.g. the name and email. */
  children?: React.ReactNode;
}) {
  const client = useQueryClient();
  const [picked, setPicked] = React.useState<File | null>(null);
  const config = useUploadConfigQuery();
  const library = useUploadsQuery({ scope: "user", kind: "image", sort: "createdAt" });
  const upload = useUploadFileMutation();
  const attach = useCreateAttachmentMutation();
  const remove = useDeleteUploadMutation();
  const profile = useUpdateProfileMutation({
    onSuccess: () => client.invalidateQueries({ queryKey: authQueryKeys.session }),
  });

  if (config.data && !config.data.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        File storage isn't configured on this server, so profile photos can't be uploaded.
      </p>
    );
  }

  /** Makes one stored photo the profile picture. `user.image` is what the rest of the app shows. */
  async function makeAvatar(uploadId: string) {
    await attach.mutateAsync({ uploadId, targetType: "user", targetId: userId, role: "avatar" });
    await profile.mutateAsync({ name, image: uploadContentUrl(uploadId) });
  }

  async function saveCropped(blob: Blob) {
    try {
      const created = await upload.mutateAsync({
        file: blob,
        scope: "user",
        filename: "avatar.webp",
      });
      await makeAvatar(created.id);
      setPicked(null);
      toast.success("Profile photo updated");
    } catch {
      // The mutations already toasted the failure; keep the cropper open to retry.
    }
  }

  const busy = upload.isPending || attach.isPending || profile.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <ClickToUpload
          rounded="full"
          busy={busy}
          label={image ? "Replace photo" : "Upload photo"}
          onFile={setPicked}
        >
          <Avatar className="size-20">
            <AvatarImage src={image ?? undefined} alt="" />
            <AvatarFallback className="text-lg">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </ClickToUpload>
        {children}
        {image ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => profile.mutate({ name, image: null })}
          >
            Remove
          </Button>
        ) : null}
      </div>

      {library.data && library.data.data.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Your photos</p>
          <ul className="flex flex-wrap gap-2">
            {library.data.data.map((item) => {
              const url = uploadContentUrl(item.id);
              return (
                <li key={item.id} className="group relative">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => makeAvatar(item.id)}
                    aria-label="Use this photo"
                    className={`size-14 overflow-hidden rounded-full border-2 ${
                      url === image ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {/* biome-ignore lint/performance/noImgElement: served by the API with the session cookie */}
                    <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete this photo"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ id: item.id, force: true })}
                    className="absolute -top-1 -right-1 hidden rounded-full bg-background p-1 shadow group-hover:block"
                  >
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <ImageCropperDialog
        file={picked}
        onCancel={() => setPicked(null)}
        onCropped={saveCropped}
        isSaving={busy}
      />
    </div>
  );
}
