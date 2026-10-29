import { z } from "zod";

/** Who owns an upload: a person (their profile picture) or a household (receipts, logos). */
export const UPLOAD_SCOPES = ["user", "household"] as const;
export const UPLOAD_KINDS = ["image", "pdf", "document", "text", "other"] as const;

export const uploadScopeSchema = z.enum(UPLOAD_SCOPES);
export const uploadKindSchema = z.enum(UPLOAD_KINDS);

export type UploadScope = z.output<typeof uploadScopeSchema>;
export type UploadKind = z.output<typeof uploadKindSchema>;

export type AttachmentRoleDefinition = {
  /** "one" replaces the previous attachment for the same target and role; "many" accumulates. */
  cardinality: "one" | "many";
  /** Kinds of upload this role accepts; "any" accepts everything. */
  kinds: readonly UploadKind[] | "any";
  label: string;
};

export type AttachmentTargetDefinition = {
  /** user targets accept user-owned uploads; every other target accepts household-owned uploads. */
  scope: UploadScope;
  roles: Readonly<Record<string, AttachmentRoleDefinition>>;
};

/**
 * Everything an upload can be attached to. Adding a new use of the storage layer
 * (a new target or role) is a change here plus a row in the API's target table;
 * no new tables or endpoints.
 */
export const ATTACHMENT_TARGETS = {
  user: {
    scope: "user",
    roles: { avatar: { cardinality: "one", kinds: ["image"], label: "Profile picture" } },
  },
  household: {
    scope: "household",
    roles: { logo: { cardinality: "one", kinds: ["image"], label: "Household picture" } },
  },
  merchant: {
    scope: "household",
    roles: { logo: { cardinality: "one", kinds: ["image"], label: "Logo" } },
  },
  account: {
    scope: "household",
    roles: { image: { cardinality: "one", kinds: ["image"], label: "Image" } },
  },
  credit_card: {
    scope: "household",
    roles: { image: { cardinality: "one", kinds: ["image"], label: "Card image" } },
  },
  category: {
    scope: "household",
    roles: { image: { cardinality: "one", kinds: ["image"], label: "Image" } },
  },
  transaction: {
    scope: "household",
    roles: {
      receipt: { cardinality: "many", kinds: ["image", "pdf"], label: "Receipt" },
      product: { cardinality: "many", kinds: ["image"], label: "Product photo" },
      document: { cardinality: "many", kinds: "any", label: "Document" },
    },
  },
  bill: {
    scope: "household",
    roles: { document: { cardinality: "many", kinds: "any", label: "Document" } },
  },
  split: {
    scope: "household",
    roles: { document: { cardinality: "many", kinds: "any", label: "Document" } },
  },
} as const satisfies Record<string, AttachmentTargetDefinition>;

export type AttachmentTargetType = keyof typeof ATTACHMENT_TARGETS;
export const ATTACHMENT_TARGET_TYPES = Object.keys(ATTACHMENT_TARGETS) as [
  AttachmentTargetType,
  ...AttachmentTargetType[],
];
export const attachmentTargetTypeSchema = z.enum(ATTACHMENT_TARGET_TYPES);

export function getAttachmentRole(
  targetType: AttachmentTargetType,
  role: string,
): AttachmentRoleDefinition | undefined {
  const roles: Readonly<Record<string, AttachmentRoleDefinition>> =
    ATTACHMENT_TARGETS[targetType].roles;
  return roles[role];
}

/** The only role of a target, used when a request leaves the role out. */
export function getDefaultAttachmentRole(targetType: AttachmentTargetType): string | undefined {
  const roles = Object.keys(ATTACHMENT_TARGETS[targetType].roles);
  return roles.length === 1 ? roles[0] : undefined;
}

export function roleAcceptsKind(role: AttachmentRoleDefinition, kind: UploadKind): boolean {
  return role.kinds === "any" || role.kinds.includes(kind);
}

export function getUploadKind(contentType: string): UploadKind {
  const type = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  // SVG can carry scripts, so it is never treated as a safe inline image.
  if (type === "image/svg+xml") return "other";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || type === "application/json") return "text";
  if (
    type.includes("officedocument") ||
    type.includes("opendocument") ||
    type === "application/msword" ||
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.ms-powerpoint" ||
    type === "application/rtf"
  ) {
    return "document";
  }
  return "other";
}

export function buildUploadContentPath(uploadId: string): string {
  return `/uploads/${uploadId}/content`;
}
