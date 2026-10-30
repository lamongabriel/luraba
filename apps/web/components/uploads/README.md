# components/uploads

Reusable UI for the storage layer. Data comes from `services/uploads.service.ts`,
`queries/uploads/`, `mutations/uploads/`; helpers in `lib/uploads.ts`.

| Component | Use |
| --- | --- |
| `AttachmentGallery` | Files attached to one record in one role: previews (images), download, remove, add (multi-select). Props: `targetType`, `targetId`, `attachmentRole`, `accept`, `addLabel`, `emptyLabel`. Hides itself behind a notice when the server has no storage. Used for transaction receipts. |
| `ClickToUpload` | **The standard way to change any picture**: wrap the record's mark or avatar in it; hover shows a camera, click opens the file picker. Never add an "Upload" button. Used by `EntityImageField` and `AvatarField`. |
| `ImageCropperDialog` | Pan/zoom crop to a 512px square WebP in a round (`shape="round"`, profile photo) or square (`shape="square"`, record pictures) frame (`react-easy-crop`). `file` opens it, `onCropped(blob)` returns the result. Used by the profile photo and by `EntityImageField`, so every picture upload is cropped and zoomable. |

Related: `components/settings/avatar-field.tsx` (crop, upload with scope `user`, attach to the `user`
target, set `user.image`, personal photo library with delete).

## How files are shown

`uploadContentUrl(id)` is the API's `/uploads/:id/content`, authorized by the session cookie, so it
works directly in `<img src>`, `<a href>` and `<iframe>`; add `{ download: true }` to force a
download. Never build bucket URLs in the browser.

## Adding file support to a screen

1. Make sure the record type and role exist in `ATTACHMENT_TARGETS`
   (`packages/contracts/src/uploads/catalog.ts`).
2. Render `<AttachmentGallery targetType="..." targetId={record.id} attachmentRole="..." />`.
3. Gate extra controls with `PERMISSIONS.UPLOADS_*` (`PermissionButton`).

## Picture on a record

`entity-image-field.tsx` (`EntityImageField`) uploads, attaches and sets/clears one picture on an existing record (account photo, merchant logo). The caller passes `onChange(uploadId | null)` to update its own field. Used by `components/accounts/account-image-field.tsx` and `components/merchants/merchant-image-field.tsx`.
