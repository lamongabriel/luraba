import { getEndpointRouterPath, PERMISSIONS, recurringBillsEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./recurring-bills.controller";

const router = Router();
router.get(
  getEndpointRouterPath(recurringBillsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_READ }),
  controller.list,
);
router.post(
  getEndpointRouterPath(recurringBillsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_CREATE }),
  controller.create,
);
router.get(
  getEndpointRouterPath(recurringBillsEndpoints.occurrences),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_READ }),
  controller.occurrences,
);
router.post(
  getEndpointRouterPath(recurringBillsEndpoints.skip),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_UPDATE }),
  controller.skip,
);
router.post(
  getEndpointRouterPath(recurringBillsEndpoints.reschedule),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_UPDATE }),
  controller.reschedule,
);
router.post(
  getEndpointRouterPath(recurringBillsEndpoints.createOccurrence),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_CREATE }),
  controller.createOccurrence,
);
router.get(
  getEndpointRouterPath(recurringBillsEndpoints.get),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_READ }),
  controller.get,
);
router.patch(
  getEndpointRouterPath(recurringBillsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_UPDATE }),
  controller.update,
);
router.delete(
  getEndpointRouterPath(recurringBillsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.RECURRING_BILLS_DELETE }),
  controller.remove,
);
export default router;
