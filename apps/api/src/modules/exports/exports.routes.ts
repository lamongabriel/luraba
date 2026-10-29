import {
  exportParamsSchema,
  exportQuerySchema,
  exportsEndpoints,
  getEndpointRouterPath,
  PERMISSIONS,
} from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import { createHouseholdHandler } from "@/shared/controllers/household.controller";
import { buildExport, listExporters } from "./exports.service";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.EXPORTS_READ });

export const list = createHouseholdHandler({
  response: exportsEndpoints.list.response,
  handle: async () => listExporters(),
});

router.get(getEndpointRouterPath(exportsEndpoints.list), read, list);

/** `GET /exports/:exporterId?format=csv|json`: a file download, so a plain route outside the contract registry. */
router.get("/:exporterId", read, async (req, res) => {
  const { exporterId } = exportParamsSchema.parse(req.params);
  const query = exportQuerySchema.parse(req.query);
  const file = await buildExport(
    req.household as NonNullable<typeof req.household>,
    exporterId,
    query,
  );
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
  res.send(file.body);
});

export default router;
