import webpush from "web-push";
import { logger } from "../logger.js";
import type { ChannelProvider } from "./types.js";

export type PushConfig = { publicKey: string; privateKey: string; subject: string };
type PushSender = Pick<typeof webpush, "sendNotification" | "setVapidDetails">;

function getStatusCode(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : undefined;
}

export function createPushChannel(
  config: PushConfig | undefined,
  /** Called when a browser revoked its subscription, so it is not tried again. */
  onSubscriptionExpired: (endpoint: string) => Promise<void>,
  sender: PushSender = webpush,
): ChannelProvider {
  let configured = false;

  return {
    channel: "push",
    isAvailable: () => config !== undefined,
    async deliver(recipient, message) {
      if (!config) return { status: "skipped", reason: "Push is not configured" };
      if (recipient.pushSubscriptions.length === 0) {
        return { status: "skipped", reason: "No registered browsers" };
      }

      if (!configured) {
        sender.setVapidDetails(config.subject, config.publicKey, config.privateKey);
        configured = true;
      }

      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        url: message.url ?? "/",
        tag: message.notificationId,
      });

      let delivered = 0;
      let lastError: unknown;

      for (const subscription of recipient.pushSubscriptions) {
        try {
          await sender.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 60 * 60 * 24 },
          );
          delivered += 1;
        } catch (error) {
          const status = getStatusCode(error);
          if (status === 404 || status === 410) {
            await onSubscriptionExpired(subscription.endpoint);
            continue;
          }
          logger.warn({ err: error, status }, "[push] Delivery failed");
          lastError = error;
        }
      }

      if (delivered > 0) return { status: "sent" };
      if (lastError) throw lastError;
      return { status: "skipped", reason: "All browser subscriptions had expired" };
    },
  };
}
