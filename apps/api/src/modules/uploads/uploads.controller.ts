import { uploadsEndpoints } from "@luraba/contracts/uploads";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getAuthenticatedUser } from "@/middleware/access.middleware";
import { createAuthenticatedHandler } from "@/shared/controllers/authenticated.controller";
import { ValidationError } from "@/shared/errors";
import { sendCreated, withApiMeta } from "@/shared/response";
import * as service from "./uploads.service";

const e = uploadsEndpoints;

function actorOf(req: Request): service.UploadActor {
  return { userId: getAuthenticatedUser(req).id, householdId: req.household?.householdId };
}

export const config = createAuthenticatedHandler({
  response: e.config.response,
  handle: async () => service.getConfig(),
});

export const usage = createAuthenticatedHandler({
  query: e.usage.query,
  response: e.usage.response,
  handle: ({ req, query }) => service.getUsage(actorOf(req), query.scope),
});

export const list = createAuthenticatedHandler({
  query: e.list.query,
  response: e.list.response,
  meta: e.list.meta,
  handle: async ({ req, query }) => {
    const { scope, ...filters } = query;
    const result = await service.listUploads(actorOf(req), scope, filters);
    return withApiMeta(result.data, result.meta);
  },
});

export const get = createAuthenticatedHandler({
  params: e.get.params,
  response: e.get.response,
  handle: ({ user, params }) => service.getUpload(user.id, params.id),
});

export const remove = createAuthenticatedHandler({
  params: e.delete.params,
  query: e.delete.query,
  status: "no-content",
  handle: ({ user, params, query }) =>
    service.deleteUpload(user.id, params.id, query.force === true),
});

export const cleanup = createAuthenticatedHandler({
  query: e.cleanup.query,
  body: e.cleanup.body,
  response: e.cleanup.response,
  handle: ({ req, query, body }) => service.cleanupUnused(actorOf(req), query.scope, body),
});

export const listAttachments = createAuthenticatedHandler({
  query: e.listAttachments.query,
  response: e.listAttachments.response,
  handle: ({ req, query }) => service.listAttachments(actorOf(req), query),
});

export const createAttachment = createAuthenticatedHandler({
  body: e.createAttachment.body,
  response: e.createAttachment.response,
  status: "created",
  handle: ({ user, body }) => service.createAttachment(user.id, body),
});

export const deleteAttachment = createAuthenticatedHandler({
  params: e.deleteAttachment.params,
  status: "no-content",
  handle: ({ user, params }) => service.deleteAttachment(user.id, params.id),
});

// ─── Binary routes ───────────────────────────────────────────────────────

const scopeQuery = z.object({ scope: z.enum(["user", "household"]).default("household") });

/** Handles the multipart body that multer parsed into `req.file`. */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { scope } = scopeQuery.parse(req.query);
    const file = req.file;
    if (!file) throw new ValidationError('Send the file in a multipart "file" field');

    const upload = await service.createUpload(actorOf(req), scope, {
      buffer: file.buffer,
      originalName: file.originalname,
      declaredType: file.mimetype,
    });
    sendCreated(res, e.create.response.parse(upload));
  } catch (err) {
    next(err);
  }
}

function parseRange(header: string | undefined) {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) return undefined;
  // Suffix ranges ("bytes=-500") are rare for our use; fall back to the whole file.
  if (match[1] === "") return undefined;
  return { start: Number(match[1]), end: match[2] ? Number(match[2]) : undefined };
}

const INLINE_KINDS = new Set(["image", "pdf"]);

/** Streams a file. Cookie-authenticated so it works from an <img> or <iframe> with no extra headers. */
export async function content(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = e.get.params.parse(req.params);
    const range = parseRange(req.headers.range);
    const { upload, object } = await service.getContent(getAuthenticatedUser(req).id, id, range);

    const etag = `"${upload.sha256}"`;
    if (req.headers["if-none-match"] === etag) {
      object.body.destroy();
      res.status(304).end();
      return;
    }

    const inline = INLINE_KINDS.has(upload.kind) && req.query.download !== "1";
    res.setHeader("Content-Type", upload.contentType);
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Same site (not same origin) so the web app can show images served by the API in development.
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (upload.kind !== "pdf")
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(upload.filename)}`,
    );

    if (object.range) {
      res.status(206);
      res.setHeader(
        "Content-Range",
        `bytes ${object.range.start}-${object.range.end}/${object.totalLength ?? "*"}`,
      );
    }
    if (object.contentLength !== undefined) res.setHeader("Content-Length", object.contentLength);

    object.body.on("error", (err) => {
      if (!res.headersSent) next(err);
      else res.destroy(err);
    });
    object.body.pipe(res);
  } catch (err) {
    next(err);
  }
}
