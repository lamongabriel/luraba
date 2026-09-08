import { getEndpointRouterPath, netWorthEndpoints, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./networth.controller";

const router = Router();
router.get(
  getEndpointRouterPath(netWorthEndpoints.summary),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_READ }),
  controller.summary,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.history),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_READ }),
  controller.history,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.accounts),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_READ }),
  controller.accounts,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.cashFlow),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  controller.cashFlow,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.spendingBreakdown),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  controller.spendingBreakdown,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.incomeBreakdown),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  controller.incomeBreakdown,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.recentActivity),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  controller.recentActivity,
);
router.get(
  getEndpointRouterPath(netWorthEndpoints.creditCards),
  requireAccess({ permission: PERMISSIONS.CREDIT_CARDS_READ }),
  controller.creditCards,
);
export default router;
