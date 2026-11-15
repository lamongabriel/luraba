import { getEndpointRouterPath, PERMISSIONS, piggyBanksEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./piggy-banks.controller";

const router = Router();
const read = requireAccess({ permission: PERMISSIONS.PIGGY_BANKS_READ });
const create = requireAccess({ permission: PERMISSIONS.PIGGY_BANKS_CREATE });
const update = requireAccess({ permission: PERMISSIONS.PIGGY_BANKS_UPDATE });
const admin = requireAccess({ permission: PERMISSIONS.PIGGY_BANKS_DELETE });
const goalUpdate = requireAccess({ permission: PERMISSIONS.GOALS_UPDATE });
const goalRead = requireAccess({ permission: PERMISSIONS.GOALS_READ });
const e = piggyBanksEndpoints;
const path = getEndpointRouterPath;

// Fixed paths first so they are not read as `:id`.
router.get(path(e.list), read, controller.list);
router.get(path(e.report), read, controller.report);
router.post(path(e.bulkDeposit), update, controller.bulkDeposit);
router.post(path(e.move), update, controller.move);
router.post(path(e.accrue), admin, controller.accrue);
router.post(path(e.create), create, controller.create);
router.get(path(e.get), read, controller.get);
router.patch(path(e.update), update, controller.update);
router.post(path(e.archive), update, controller.archive);
router.post(path(e.unarchive), update, controller.unarchive);
router.get(path(e.movements), read, controller.movements);
router.post(path(e.deposit), update, controller.deposit);
router.post(path(e.withdraw), update, controller.withdraw);
router.post(path(e.setBalance), update, controller.setBalance);

/** Mounted on `/goals`: the link and plan endpoints live under the goal's path. */
export const goalPiggyBanksRouter = Router();
goalPiggyBanksRouter.get(path(e.goalLinks), goalRead, controller.goalLinks);
goalPiggyBanksRouter.put(path(e.setGoalLinks), goalUpdate, controller.setGoalLinks);
goalPiggyBanksRouter.get(path(e.goalPlan), goalRead, controller.goalPlan);

export default router;
