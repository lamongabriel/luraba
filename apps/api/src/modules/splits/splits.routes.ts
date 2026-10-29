import { getEndpointRouterPath, PERMISSIONS, splitsEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./splits.controller";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.SPLITS_READ });
const create = requireAccess({ permission: PERMISSIONS.SPLITS_CREATE });
const update = requireAccess({ permission: PERMISSIONS.SPLITS_UPDATE });
const remove = requireAccess({ permission: PERMISSIONS.SPLITS_DELETE });
const path = getEndpointRouterPath;
const e = splitsEndpoints;

router.get(path(e.list), read, controller.list);
router.get(path(e.get), read, controller.get);
router.post(path(e.create), create, controller.create);
router.patch(path(e.update), update, controller.update);
router.delete(path(e.delete), remove, controller.deleteSplit);
router.post(path(e.addParticipant), update, controller.addParticipant);
router.patch(path(e.updateParticipant), update, controller.updateParticipant);
router.delete(path(e.removeParticipant), update, controller.removeParticipant);
router.post(path(e.addInstallments), update, controller.addInstallments);
router.patch(path(e.updateInstallment), update, controller.updateInstallment);
router.delete(path(e.removeInstallment), update, controller.removeInstallment);
router.post(path(e.linkInstallment), update, controller.linkInstallment);
router.post(path(e.receiveInstallment), update, controller.receiveInstallment);
router.post(path(e.skipInstallment), update, controller.skipInstallment);
router.post(path(e.writeOffInstallment), update, controller.writeOffInstallment);
router.post(path(e.resetInstallment), update, controller.resetInstallment);

export default router;
