import { getEndpointRouterPath, goalsEndpoints, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./goals.controller";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.GOALS_READ });
const create = requireAccess({ permission: PERMISSIONS.GOALS_CREATE });
const update = requireAccess({ permission: PERMISSIONS.GOALS_UPDATE });
const remove = requireAccess({ permission: PERMISSIONS.GOALS_DELETE });
const path = getEndpointRouterPath;

router.get(path(goalsEndpoints.list), read, controller.list);
router.get(path(goalsEndpoints.report), read, controller.report);
router.get(path(goalsEndpoints.get), read, controller.get);
router.post(path(goalsEndpoints.create), create, controller.create);
router.patch(path(goalsEndpoints.update), update, controller.update);
router.delete(path(goalsEndpoints.delete), remove, controller.deleteGoal);
router.post(path(goalsEndpoints.contribute), update, controller.contribute);
router.post(path(goalsEndpoints.moveFunds), update, controller.moveFunds);
router.post(path(goalsEndpoints.withdraw), update, controller.withdraw);
router.post(path(goalsEndpoints.addContribution), update, controller.addContribution);
router.patch(path(goalsEndpoints.updateContribution), update, controller.updateContribution);
router.delete(path(goalsEndpoints.removeContribution), update, controller.removeContribution);

export default router;
