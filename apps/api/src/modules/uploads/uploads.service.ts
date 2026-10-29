import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { hasHouseholdPermission, PERMISSIONS } from "@luraba/contracts";
import {
  ATTACHMENT_TARGETS,
  type Attachment,
  type AttachmentTargetType,
  getAttachmentRole,
  getDefaultAttachmentRole,
  getUploadKind,
  roleAcceptsKind,
  type Upload,
  type UploadCleanupResult,
  type UploadScope,
  type UploadUsage,
} from "@luraba/contracts/uploads";
import { formatISODateTime } from "@luraba/domain";
import { fileTypeFromBuffer } from "file-type";
import { env } from "@/config/env";
import { db } from "@/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import { logger } from "@/shared/logger";
import * as repository from "./uploads.repository";
import { getStorage, isStorageEnabled } from "./uploads.storage";
import {
  householdTargetExists,
  pruneDanglingAttachments,
  userExists,
  usersShareHousehold,
} from "./uploads.targets";
import type { AttachmentWithUpload, UploadRecord } from "./uploads.types";

export type UploadActor = {
  userId: string;
  /** Present when the request ran with a household (scope "household"). */
  householdId?: string;
};

export type IncomingFile = { buffer: Buffer; originalName: string; declaredType: string };

// ─── Mapping ─────────────────────────────────────────────────────────────

function toUpload(record: UploadRecord): Upload {
  return {
    id: record.id,
    scope: record.scope,
    householdId: record.householdId,
    uploadedByUserId: record.uploadedByUserId,
    filename: record.filename,
    contentType: record.contentType,
    kind: record.kind,
    sizeBytes: record.sizeBytes,
    sha256: record.sha256,
    attachmentCount: record.attachmentCount,
    createdAt: formatISODateTime(record.createdAt),
  };
}

function toAttachment({ attachment, upload }: AttachmentWithUpload): Attachment {
  return {
    id: attachment.id,
    uploadId: attachment.uploadId,
    targetType: attachment.targetType as AttachmentTargetType,
    targetId: attachment.targetId,
    role: attachment.role,
    position: attachment.position,
    createdAt: formatISODateTime(attachment.createdAt),
    upload: toUpload(upload),
  };
}

// ─── Access ──────────────────────────────────────────────────────────────

type Action = "read" | "write" | "delete";

/**
 * Household uploads follow the member's role; personal uploads belong to their
 * uploader. Anything the caller cannot see is reported as missing.
 */
export async function assertAccess(
  userId: string,
  upload: UploadRecord,
  action: Action,
): Promise<void> {
  if (upload.scope === "user") {
    if (upload.uploadedByUserId === userId) return;

    if (action === "read") {
      // A profile picture is visible to the people who share a household with its owner.
      for (const ownerId of await repository.listUserTargetsOfUpload(upload.id)) {
        if (await usersShareHousehold(userId, ownerId)) return;
      }
    }
    throw new NotFoundError("Upload");
  }

  const role = upload.householdId
    ? await repository.getMemberRole(userId, upload.householdId)
    : undefined;
  if (!role) throw new NotFoundError("Upload");

  const permission = {
    read: PERMISSIONS.UPLOADS_READ,
    write: PERMISSIONS.UPLOADS_CREATE,
    delete: PERMISSIONS.UPLOADS_DELETE,
  }[action];

  const allowed =
    hasHouseholdPermission(role, permission) ||
    // People can always remove what they uploaded themselves.
    (action === "delete" &&
      upload.uploadedByUserId === userId &&
      hasHouseholdPermission(role, PERMISSIONS.UPLOADS_CREATE));
  if (!allowed) throw new ForbiddenError("You do not have permission to perform this action");
}

export async function requireUpload(
  userId: string,
  uploadId: string,
  action: Action,
): Promise<UploadRecord> {
  const upload = await repository.getUpload(uploadId);
  if (!upload) throw new NotFoundError("Upload");
  await assertAccess(userId, upload, action);
  return upload;
}

function toOwner(scope: UploadScope, actor: UploadActor): repository.LibraryOwner {
  if (scope === "user") return { scope: "user", userId: actor.userId };
  if (!actor.householdId) throw new ForbiddenError("A household is required for this request");
  return { scope: "household", householdId: actor.householdId };
}

// ─── Uploads ─────────────────────────────────────────────────────────────

export function getConfig() {
  return { enabled: isStorageEnabled(), maxUploadBytes: env.maxUploadBytes };
}

function cleanFilename(name: string): string {
  // Multer reports UTF-8 names as latin1; undo that so "recibo-ação.pdf" survives.
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
  const cleaned = path.basename(decoded.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "");
  return cleaned.trim().slice(0, 255) || "file";
}

async function detectContentType(file: IncomingFile): Promise<string> {
  // Trust the bytes over the client: a renamed executable must not pass as an image.
  const detected = await fileTypeFromBuffer(file.buffer);
  if (detected) return detected.mime;

  const declared = file.declaredType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (declared.startsWith("text/") || declared === "application/json") return declared;
  return "application/octet-stream";
}

export async function createUpload(
  actor: UploadActor,
  scope: UploadScope,
  file: IncomingFile,
): Promise<Upload> {
  const owner = toOwner(scope, actor);
  const storage = getStorage();

  if (file.buffer.length === 0) throw new ValidationError("The file is empty");
  if (file.buffer.length > env.maxUploadBytes) {
    throw new ValidationError(
      `The file is larger than the ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB limit`,
    );
  }

  const contentType = await detectContentType(file);
  const id = randomUUID();
  const storageKey =
    owner.scope === "user"
      ? `users/${actor.userId}/${id}`
      : `households/${owner.householdId}/${id}`;

  await storage.put({
    key: storageKey,
    body: file.buffer,
    contentType,
    metadata: { uploadId: id, uploadedBy: actor.userId },
  });

  try {
    const record = await repository.insertUpload({
      id,
      scope,
      householdId: owner.scope === "household" ? owner.householdId : null,
      uploadedByUserId: actor.userId,
      storageKey,
      filename: cleanFilename(file.originalName),
      contentType,
      kind: getUploadKind(contentType),
      sizeBytes: file.buffer.length,
      sha256: createHash("sha256").update(file.buffer).digest("hex"),
    });
    return toUpload(record);
  } catch (error) {
    await storage.delete(storageKey).catch((err) => {
      logger.warn({ err, storageKey }, "[uploads] Could not remove object after a failed insert");
    });
    throw error;
  }
}

export async function getUpload(userId: string, uploadId: string): Promise<Upload> {
  return toUpload(await requireUpload(userId, uploadId, "read"));
}

export async function listUploads(
  actor: UploadActor,
  scope: UploadScope,
  query: Omit<Parameters<typeof repository.listUploadsPage>[1], never>,
): Promise<ListResult<Upload>> {
  const page = await repository.listUploadsPage(toOwner(scope, actor), query);
  return { data: page.rows.map(toUpload), meta: createListMeta(query, page.totalCount) };
}

export async function deleteUpload(
  userId: string,
  uploadId: string,
  force: boolean,
): Promise<void> {
  const upload = await requireUpload(userId, uploadId, "delete");

  if (upload.attachmentCount > 0 && !force) {
    throw new ConflictError(
      `This file is used in ${upload.attachmentCount} place(s). Remove it from there first, or delete it anyway.`,
    );
  }

  await repository.deleteUploads([upload.id]);
  await getStorage()
    .delete(upload.storageKey)
    .catch((err) => {
      logger.warn({ err, storageKey: upload.storageKey }, "[uploads] Could not delete object");
    });
}

export async function getUsage(actor: UploadActor, scope: UploadScope): Promise<UploadUsage> {
  const rows = await repository.getUsage(toOwner(scope, actor));
  const usage: UploadUsage = {
    totalCount: 0,
    totalBytes: 0,
    attachedCount: 0,
    unattachedCount: 0,
    unattachedBytes: 0,
    byKind: [],
  };

  for (const row of rows) {
    usage.totalCount += row.count;
    usage.totalBytes += row.bytes;
    usage.unattachedCount += row.unattachedCount;
    usage.unattachedBytes += row.unattachedBytes;
    usage.byKind.push({ kind: row.kind, count: row.count, bytes: row.bytes });
  }
  usage.attachedCount = usage.totalCount - usage.unattachedCount;

  return usage;
}

export async function cleanupUnused(
  actor: UploadActor,
  scope: UploadScope,
  body: { olderThanDays: number; dryRun: boolean },
): Promise<UploadCleanupResult> {
  const owner = toOwner(scope, actor);
  const prunedAttachments =
    owner.scope === "household" && !body.dryRun
      ? await pruneDanglingAttachments(owner.householdId)
      : 0;

  const cutoff = new Date(Date.now() - body.olderThanDays * 24 * 60 * 60 * 1000);
  const unused = await repository.listUnattachedUploads(owner, cutoff);
  const freedBytes = unused.reduce((sum, upload) => sum + upload.sizeBytes, 0);

  if (!body.dryRun && unused.length > 0) {
    await repository.deleteUploads(unused.map((upload) => upload.id));
    const failed = await getStorage().deleteMany(unused.map((upload) => upload.storageKey));
    if (failed.length > 0) {
      logger.warn({ failed: failed.length }, "[uploads] Some objects could not be deleted");
    }
  }

  return {
    dryRun: body.dryRun,
    deletedCount: unused.length,
    freedBytes,
    prunedAttachments,
  };
}

/**
 * Household deletion cascades the upload rows away, so the bucket keys are read
 * first and the objects removed only after the household is really gone.
 */
export async function collectHouseholdObjectKeys(householdId: string): Promise<string[]> {
  return isStorageEnabled() ? repository.listHouseholdStorageKeys(householdId) : [];
}

export async function deleteObjects(keys: readonly string[]): Promise<void> {
  if (keys.length === 0 || !isStorageEnabled()) return;

  const failed = await getStorage()
    .deleteMany(keys)
    .catch((err) => {
      logger.warn({ err }, "[uploads] Could not delete household objects");
      return [...keys];
    });
  if (failed.length > 0) logger.warn({ failed: failed.length }, "[uploads] Some objects remain");
}

// ─── Content ─────────────────────────────────────────────────────────────

export async function getContent(
  userId: string,
  uploadId: string,
  range?: { start: number; end?: number },
) {
  const upload = await requireUpload(userId, uploadId, "read");
  const object = await getStorage().get(upload.storageKey, range);
  if (!object) throw new NotFoundError("File");
  return { upload, object };
}

// ─── Attachments ─────────────────────────────────────────────────────────

export async function createAttachment(
  userId: string,
  body: { uploadId: string; targetType: AttachmentTargetType; targetId: string; role?: string },
): Promise<Attachment> {
  const upload = await requireUpload(userId, body.uploadId, "write");
  const target = ATTACHMENT_TARGETS[body.targetType];

  if (target.scope !== upload.scope) {
    throw new ValidationError(
      target.scope === "user"
        ? "Only your personal uploads can be used for your profile"
        : "Personal uploads can only be used for your profile",
    );
  }

  const role = body.role ?? getDefaultAttachmentRole(body.targetType);
  const roleDefinition = role ? getAttachmentRole(body.targetType, role) : undefined;
  if (!role || !roleDefinition) {
    throw new ValidationError(`Choose how this file is used on a ${body.targetType}`);
  }
  if (!roleAcceptsKind(roleDefinition, upload.kind)) {
    throw new ValidationError(
      `A ${roleDefinition.label.toLowerCase()} can't be a ${upload.kind} file`,
    );
  }

  if (upload.scope === "user") {
    if (body.targetId !== userId || !(await userExists(userId))) throw new NotFoundError("User");
  } else if (
    !upload.householdId ||
    !(await householdTargetExists(body.targetType, body.targetId, upload.householdId))
  ) {
    throw new NotFoundError(`Target ${body.targetType}`);
  }

  const existing = await repository.findAttachment(upload.id, body.targetType, body.targetId, role);
  if (existing) return toAttachment({ attachment: existing, upload });

  const created = await db.transaction(async (tx) => {
    if (roleDefinition.cardinality === "one") {
      await repository.deleteAttachmentsForTargetRole(tx, body.targetType, body.targetId, role);
    }
    return repository.insertAttachment(tx, {
      uploadId: upload.id,
      targetType: body.targetType,
      targetId: body.targetId,
      role,
      position: await repository.nextPosition(tx, body.targetType, body.targetId, role),
      createdByUserId: userId,
    });
  });

  const withCount = await repository.getUpload(upload.id);
  return toAttachment({ attachment: created, upload: withCount ?? upload });
}

export async function listAttachments(
  actor: UploadActor,
  query: { targetType: AttachmentTargetType; targetIds: string[]; role?: string },
): Promise<Attachment[]> {
  if (query.targetType === "user") {
    const visible: string[] = [];
    for (const targetId of query.targetIds) {
      if (await usersShareHousehold(actor.userId, targetId)) visible.push(targetId);
    }
    return (await repository.listAttachmentsForTargets("user", visible, { role: query.role })).map(
      toAttachment,
    );
  }

  if (!actor.householdId) throw new ForbiddenError("A household is required for this request");
  return (
    await repository.listAttachmentsForTargets(query.targetType, query.targetIds, {
      role: query.role,
      householdId: actor.householdId,
    })
  ).map(toAttachment);
}

export async function deleteAttachment(userId: string, attachmentId: string): Promise<void> {
  const found = await repository.getAttachment(attachmentId);
  if (!found) throw new NotFoundError("Attachment");

  await assertAccess(userId, found.upload, "write");
  await repository.deleteAttachment(attachmentId);
}
