import { SMS_PROVIDERS } from "@luraba/contracts/notifications";
import type { ChannelAvailability, ExternalChannel } from "@luraba/notifications";
import { env } from "@/config/env";
import { isMailConfigured } from "@/modules/mail/mail.config";

/** Whether this deployment can send on each channel at all. The worker enforces the same rules. */
export const channelAvailability: ChannelAvailability = {
  email: isMailConfigured(env.mail),
  push: env.push !== undefined,
  sms:
    env.smsProvider !== undefined && (SMS_PROVIDERS as readonly string[]).includes(env.smsProvider),
};

export function isChannelAvailable(channel: ExternalChannel): boolean {
  return channelAvailability[channel];
}
