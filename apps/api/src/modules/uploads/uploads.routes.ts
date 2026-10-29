import { getEndpointRouterPath, PERMISSIONS, uploadsEndpoints } from "@luraba/contracts";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { env } from "@/config/env";
import { requireAccess } from "@/middleware/access.middleware";
import { ValidationError } from "@/shared/errors";
import * as controller from "./uploads.controller";

const router = Router();
const path = getEndpointRouterPath;
const e = uploadsEndpoints;

const parseMultipart = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
}).single("file");

function readScope(req: Request): "user" | "household" {
  return req.query.scope === "user" ? "user" : "household";
}

/**
 * Personal (scope=user) requests only need a signed-in user; household requests
 * also resolve the household and require the permission.
 */
function scoped(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const authOnly = requireAccess();
  const household = requireAccess({ permission });
  return (req: Request, res: Response, next: NextFunction) =>
    (readScope(req) === "user" ? authOnly : household)(req, res, next);
}

/** Attachments to a user need only a session; every other target is household data. */
function attachmentsAccess(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const authOnly = requireAccess();
  const household = requireAccess({ permission });
  return (req: Request, res: Response, next: NextFunction) =>
    (req.query.targetType === "user" ? authOnly : household)(req, res, next);
}

function uploadFile(req: Request, res: Response, next: NextFunction) {
  parseMultipart(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      next(
        new ValidationError(
          error.code === "LIMIT_FILE_SIZE"
            ? `The file is larger than the ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB limit`
            : error.message,
        ),
      );
      return;
    }
    next(error);
  });
}

const authOnly = requireAccess();

// Static paths first so "config", "usage" and "cleanup" are not read as an id.
router.get(path(e.config), authOnly, controller.config);
router.get(path(e.usage), scoped(PERMISSIONS.UPLOADS_READ), controller.usage);
router.post(path(e.cleanup), scoped(PERMISSIONS.UPLOADS_DELETE), controller.cleanup);
router.get(path(e.list), scoped(PERMISSIONS.UPLOADS_READ), controller.list);
router.post(path(e.create), scoped(PERMISSIONS.UPLOADS_CREATE), uploadFile, controller.create);
router.get("/:id/content", authOnly, controller.content);
router.get(path(e.get), authOnly, controller.get);
router.delete(path(e.delete), authOnly, controller.remove);

export const attachmentsRouter = Router();
attachmentsRouter.get(
  path(e.listAttachments),
  attachmentsAccess(PERMISSIONS.UPLOADS_READ),
  controller.listAttachments,
);
attachmentsRouter.post(path(e.createAttachment), authOnly, controller.createAttachment);
attachmentsRouter.delete(path(e.deleteAttachment), authOnly, controller.deleteAttachment);

export default router;
