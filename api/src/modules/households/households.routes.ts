import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as householdsController from './households.controller';

const router = Router();

router.get('/', requireAccess(), householdsController.list);
router.post('/', requireAccess(), householdsController.create);
router.get('/invites', requireAccess(), householdsController.listMyInvites);
router.post('/invites/:id/accept', requireAccess(), householdsController.acceptInvite);

router.patch(
  '/:id',
  requireAccess({ permission: 'household.update', householdParam: 'id' }),
  householdsController.update,
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
router.delete(
  '/:id/invites/:inviteId',
  requireAccess({ permission: 'household.invites.manage', householdParam: 'id' }),
  householdsController.revokeInvite,
);

export default router;
