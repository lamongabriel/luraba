import type { ChannelProvider } from "./types.js";

/**
 * Transport for a concrete SMS vendor (Twilio, AWS SNS, Zenvia, ...). To add one,
 * implement this, return it from `resolveSmsProvider`, and list its name in
 * `SMS_PROVIDERS` in @luraba/contracts so the API reports the channel as available.
 */
export interface SmsProvider {
  readonly name: string;
  send(to: string, text: string): Promise<void>;
}

/** No vendor is bundled yet, so SMS stays unavailable until one is wired in here. */
export function resolveSmsProvider(_providerName: string | undefined): SmsProvider | undefined {
  return undefined;
}

export function formatSmsText(title: string, body: string): string {
  return `${title}\n${body}`.slice(0, 320);
}

export function createSmsChannel(provider: SmsProvider | undefined): ChannelProvider {
  return {
    channel: "sms",
    isAvailable: () => provider !== undefined,
    async deliver(recipient, message) {
      if (!provider) return { status: "skipped", reason: "SMS provider is not configured" };
      if (!recipient.phoneNumber) return { status: "skipped", reason: "No phone number" };

      await provider.send(recipient.phoneNumber, formatSmsText(message.title, message.body));
      return { status: "sent" };
    },
  };
}
