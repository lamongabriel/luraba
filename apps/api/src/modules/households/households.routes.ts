import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as householdsController from './households.controller';

const router = Router();

router.get('/', requireAccess(), householdsController.list);
router.post('/', requireAccess(), householdsController.create);
router.get('/roles', requireAccess(), householdsController.listRoles);
router.get('/permissions', requireAccess(), householdsController.listPermissions);
router.get('/invite-statuses', requireAccess(), householdsController.listInviteStatuses);
router.get('/invites/preview', householdsController.previewInvite);
router.get('/invites', requireAccess(), householdsController.listMyInvites);
router.post('/invites/accept', requireAccess(), householdsController.acceptInvite);
router.post('/invites/reject', requireAccess(), householdsController.rejectInvite);
router.post('/invites/:inviteId/accept', householdsController.acceptInviteById);
router.post('/invites/:inviteId/reject', householdsController.rejectInviteById);

router.get(
  '/:id',
  requireAccess({ permission: 'household.read', householdParam: 'id' }),
  householdsController.get,
);
router.patch(
  '/:id',
  requireAccess({ permission: 'household.update', householdParam: 'id' }),
  householdsController.update,
);
router.delete(
  '/:id',
  requireAccess({ permission: 'household.delete', householdParam: 'id' }),
  householdsController.remove,
);
router.get(
  '/:id/members',
  requireAccess({ permission: 'household.members.read', householdParam: 'id' }),
  householdsController.listMembers,
);
router.patch(
  '/:id/members/:userId',
  requireAccess({ permission: 'household.members.manage', householdParam: 'id' }),
  householdsController.updateMember,
);
router.delete(
  '/:id/members/:userId',
  requireAccess({ permission: 'household.members.manage', householdParam: 'id' }),
  householdsController.removeMember,
);
router.get(
  '/:id/invites',
  requireAccess({ permission: 'household.invites.manage', householdParam: 'id' }),
  householdsController.listHouseholdInvites,
);
router.post(
  '/:id/invites',
  requireAccess({ permission: 'household.invites.manage', householdParam: 'id' }),
  householdsController.createInvite,
);
router.post(
  '/:id/invites/:inviteId/link',
  requireAccess({ permission: 'household.invites.manage', householdParam: 'id' }),
  householdsController.refreshInviteLink,
);
router.post(
  '/:id/invites/:inviteId/resend',
  requireAccess({ permission: 'household.invites.manage', householdParam: 'id' }),
  householdsController.resendInvite,
);
router.delete(
  '/:id/invites/:inviteId',
  requireAccess({ permission: 'household.invites.manage', householdParam: 'id' }),
  householdsController.cancelInvite,
);

export default router;
