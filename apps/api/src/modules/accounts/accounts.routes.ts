import { accountsEndpoints, getEndpointRouterPath, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as accountsController from "./accounts.controller";

const router = Router();

router.get(
  getEndpointRouterPath(accountsEndpoints.list),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_READ }),
  accountsController.list,
);
router.get(
  getEndpointRouterPath(accountsEndpoints.transactions),
  requireAccess({ permission: PERMISSIONS.TRANSACTIONS_READ }),
  accountsController.listTransactions,
);
router.get(
  getEndpointRouterPath(accountsEndpoints.get),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_READ }),
  accountsController.details,
);
router.post(
  getEndpointRouterPath(accountsEndpoints.create),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_CREATE }),
  accountsController.create,
);
router.patch(
  getEndpointRouterPath(accountsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_UPDATE }),
  accountsController.update,
);
router.delete(
  getEndpointRouterPath(accountsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.ACCOUNTS_DELETE }),
  accountsController.deleteAccount,
);

export default router;
