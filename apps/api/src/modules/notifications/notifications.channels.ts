import { SMS_PROVIDERS } from "@luraba/contracts/notifications";
import { env } from "@/config/env";
import { isMailConfigured } from "@/modules/mail/mail.config";
import type { ExternalChannel, RecipientContact } from "./notifications.types";

export const EXTERNAL_CHANNELS: readonly ExternalChannel[] = ["email", "push", "sms"];

/** Whether this deployment can send on a channel at all. The worker enforces the same rules. */
export function isChannelAvailable(channel: ExternalChannel): boolean {
  switch (channel) {
    case "email":
      return isMailConfigured(env.mail);
    case "push":
      return env.push !== undefined;
    case "sms":
      return (
        env.smsProvider !== undefined &&
        (SMS_PROVIDERS as readonly string[]).includes(env.smsProvider)
      );
  }
}

/** Whether the user has what the channel needs: an address, a phone number, a registered browser. */
export function isChannelReady(channel: ExternalChannel, recipient: RecipientContact): boolean {
  switch (channel) {
    case "email":
      return recipient.email.length > 0;
    case "push":
      return recipient.pushSubscriptionCount > 0;
    case "sms":
      return recipient.phoneNumber !== null;
  }
}
