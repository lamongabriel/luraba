import { getEndpointRouterPath, notificationsEndpoints } from "@luraba/contracts";
import { Router } from "express";
import { requireAccess } from "@/middleware/access.middleware";
import * as controller from "./notifications.controller";

const router = Router();

// Notifications belong to the signed-in user, not to a household.
router.use(requireAccess());

router.get(getEndpointRouterPath(notificationsEndpoints.list), controller.list);
router.get(getEndpointRouterPath(notificationsEndpoints.unreadCount), controller.unreadCount);
router.post(getEndpointRouterPath(notificationsEndpoints.markAllRead), controller.markAllRead);
router.post(getEndpointRouterPath(notificationsEndpoints.markRead), controller.markRead);
router.delete(getEndpointRouterPath(notificationsEndpoints.delete), controller.deleteNotification);
router.get(getEndpointRouterPath(notificationsEndpoints.channels), controller.channels);
router.get(getEndpointRouterPath(notificationsEndpoints.getPreferences), controller.getPreferences);
router.patch(
  getEndpointRouterPath(notificationsEndpoints.updatePreferences),
  controller.updatePreferences,
);
router.post(getEndpointRouterPath(notificationsEndpoints.subscribePush), controller.subscribePush);
router.post(
  getEndpointRouterPath(notificationsEndpoints.unsubscribePush),
  controller.unsubscribePush,
);
router.post(getEndpointRouterPath(notificationsEndpoints.sendTest), controller.sendTest);

export default router;
