import { billsEndpoints, getEndpointRouterPath, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./bills.controller";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.BILLS_READ });
const create = requireAccess({ permission: PERMISSIONS.BILLS_CREATE });
const update = requireAccess({ permission: PERMISSIONS.BILLS_UPDATE });
const remove = requireAccess({ permission: PERMISSIONS.BILLS_DELETE });
const path = getEndpointRouterPath;

// `/forecast` must be registered before `/:id`.
router.get(path(billsEndpoints.list), read, controller.list);
router.get(path(billsEndpoints.forecast), read, controller.forecast);
router.get(path(billsEndpoints.get), read, controller.get);
router.post(path(billsEndpoints.create), create, controller.create);
router.patch(path(billsEndpoints.update), update, controller.update);
router.post(path(billsEndpoints.pause), update, controller.pause);
router.post(path(billsEndpoints.resume), update, controller.resume);
router.post(path(billsEndpoints.cancel), update, controller.cancel);
router.delete(path(billsEndpoints.delete), remove, controller.deleteBill);
router.get(path(billsEndpoints.listOccurrences), read, controller.listOccurrences);
router.patch(path(billsEndpoints.updateOccurrence), update, controller.updateOccurrence);
router.post(path(billsEndpoints.linkOccurrence), update, controller.linkOccurrence);
router.post(path(billsEndpoints.markOccurrencePaid), update, controller.markOccurrencePaid);
router.post(path(billsEndpoints.skipOccurrence), update, controller.skipOccurrence);
router.post(path(billsEndpoints.resetOccurrence), update, controller.resetOccurrence);

export default router;
