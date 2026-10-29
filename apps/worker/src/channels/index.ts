import { env } from "../config/env.js";
import { deletePushSubscriptionByEndpoint } from "../notifications/repository.js";
import { createEmailChannel } from "./email.js";
import { createPushChannel } from "./push.js";
import { createSmsChannel, resolveSmsProvider } from "./sms.js";
import type { ChannelProvider, ExternalChannel } from "./types.js";

export const channelProviders: Record<ExternalChannel, ChannelProvider> = {
  email: createEmailChannel(env.mail, env.frontendOrigin),
  push: createPushChannel(env.push, deletePushSubscriptionByEndpoint),
  sms: createSmsChannel(resolveSmsProvider(env.smsProvider)),
};
