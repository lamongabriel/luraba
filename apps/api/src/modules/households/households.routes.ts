import { getEndpointRouterPath, householdsEndpoints, PERMISSIONS } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as householdsController from "./households.controller";

const router = Router();

router.get(
  getEndpointRouterPath(householdsEndpoints.list),
  requireAccess(),
  householdsController.list,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.create),
  requireAccess(),
  householdsController.create,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.roles),
  requireAccess(),
  householdsController.listRoles,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.permissions),
  requireAccess(),
  householdsController.listPermissions,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.inviteStatuses),
  requireAccess(),
  householdsController.listInviteStatuses,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.previewInvite),
  householdsController.previewInvite,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.myInvites),
  requireAccess(),
  householdsController.listMyInvites,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.acceptInvite),
  requireAccess(),
  householdsController.acceptInvite,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.rejectInvite),
  requireAccess(),
  householdsController.rejectInvite,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.acceptInviteById),
  householdsController.acceptInviteById,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.rejectInviteById),
  householdsController.rejectInviteById,
);

router.get(
  getEndpointRouterPath(householdsEndpoints.get),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_READ, householdParam: "id" }),
  householdsController.get,
);
router.patch(
  getEndpointRouterPath(householdsEndpoints.update),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_UPDATE, householdParam: "id" }),
  householdsController.update,
);
router.delete(
  getEndpointRouterPath(householdsEndpoints.delete),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_DELETE, householdParam: "id" }),
  householdsController.remove,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.members),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_MEMBERS_READ, householdParam: "id" }),
  householdsController.listMembers,
);
router.patch(
  getEndpointRouterPath(householdsEndpoints.updateMember),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_MEMBERS_MANAGE, householdParam: "id" }),
  householdsController.updateMember,
);
router.delete(
  getEndpointRouterPath(householdsEndpoints.removeMember),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_MEMBERS_MANAGE, householdParam: "id" }),
  householdsController.removeMember,
);
router.get(
  getEndpointRouterPath(householdsEndpoints.invites),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_INVITES_MANAGE, householdParam: "id" }),
  householdsController.listHouseholdInvites,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.createInvite),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_INVITES_MANAGE, householdParam: "id" }),
  householdsController.createInvite,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.refreshInviteLink),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_INVITES_MANAGE, householdParam: "id" }),
  householdsController.refreshInviteLink,
);
router.post(
  getEndpointRouterPath(householdsEndpoints.resendInvite),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_INVITES_MANAGE, householdParam: "id" }),
  householdsController.resendInvite,
);
router.delete(
  getEndpointRouterPath(householdsEndpoints.cancelInvite),
  requireAccess({ permission: PERMISSIONS.HOUSEHOLD_INVITES_MANAGE, householdParam: "id" }),
  householdsController.cancelInvite,
);

export default router;
