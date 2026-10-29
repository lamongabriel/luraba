import { getEndpointRouterPath, importsEndpoints, PERMISSIONS } from "@luraba/contracts";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { env } from "@/config/env";
import { requireAccess } from "@/middleware/access.middleware";
import { ValidationError } from "@/shared/errors";
import * as controller from "./imports.controller";

const router = Router();
const path = getEndpointRouterPath;
const e = importsEndpoints;

const parseMultipart = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
}).single("file");

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

const read = requireAccess({ permission: PERMISSIONS.IMPORTS_READ });
const write = requireAccess({ permission: PERMISSIONS.IMPORTS_CREATE });

// Static paths first so "parsers" is not read as an id.
router.get(path(e.parsers), read, controller.parsers);
router.get(path(e.list), read, controller.list);
router.post("/", write, uploadFile, controller.upload);
router.get(path(e.get), read, controller.get);
router.patch(path(e.update), write, controller.update);
router.delete(
  path(e.delete),
  requireAccess({ permission: PERMISSIONS.IMPORTS_DELETE }),
  controller.remove,
);
router.get(path(e.rows), read, controller.rows);
router.patch(path(e.updateRows), write, controller.updateRows);
router.get(path(e.groups), read, controller.groups);
router.put(path(e.saveMapping), write, controller.saveMapping);
router.post(path(e.start), write, controller.start);
router.get(path(e.reconciliation), read, controller.reconciliation);

export default router;
