import nodemailer, { type Transporter } from "nodemailer";
import type { MailConfig } from "../config/env.js";
import { renderNotificationMail } from "../mail/templates.js";
import type { ChannelProvider } from "./types.js";

type Sender = Pick<Transporter, "sendMail">;

export function createEmailChannel(
  config: MailConfig | undefined,
  frontendOrigin: string,
  createSender: (config: MailConfig) => Sender = (cfg) =>
    nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.username, pass: cfg.password },
      ...(cfg.tlsCiphers ? { tls: { ciphers: cfg.tlsCiphers } } : {}),
    }),
): ChannelProvider {
  let sender: Sender | undefined;

  return {
    channel: "email",
    isAvailable: () => config !== undefined,
    async deliver(recipient, message) {
      if (!config) return { status: "skipped", reason: "Email is not configured" };
      if (!recipient.email) return { status: "skipped", reason: "No email address" };

      const rendered = renderNotificationMail({
        title: message.title,
        body: message.body,
        actionUrl: message.url ? new URL(message.url, frontendOrigin).toString() : undefined,
      });

      sender ??= createSender(config);
      await sender.sendMail({
        from: { name: config.fromName, address: config.fromEmail },
        to: recipient.email,
        replyTo: config.replyEmail,
        ...rendered,
      });
      return { status: "sent" };
    },
  };
}
