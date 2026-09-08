import nodemailer from "nodemailer";
import type { Address } from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "@/config/env";
import { DependencyUnavailableError } from "@/shared/errors";
import { isMailConfigured } from "./mail.config";
import { sendMailPayloadSchema } from "./mail.schemas";
import type {
  MailAddress,
  MailConfig,
  MailTransporter,
  MailTransportFactory,
  SendMailPayload,
  SendMailResult,
} from "./mail.types";

function formatRecipient(recipient: string | Address): string {
  return typeof recipient === "string" ? recipient : recipient.address;
}

export class MailService {
  private transporter?: MailTransporter;

  constructor(
    private readonly config: MailConfig,
    private readonly createTransport: MailTransportFactory = (options) =>
      nodemailer.createTransport(options),
  ) {}

  isConfigured(): boolean {
    return isMailConfigured(this.config);
  }

  async send(payload: SendMailPayload): Promise<SendMailResult> {
    const parsed = sendMailPayloadSchema.parse(payload);

    if (!isMailConfigured(this.config)) {
      throw new DependencyUnavailableError("Email delivery is not configured");
    }

    try {
      const result = await this.getTransporter().sendMail({
        from: parsed.from ?? this.defaultFrom(),
        to: parsed.to,
        subject: parsed.subject,
        html: parsed.html,
        text: parsed.text,
        replyTo: parsed.replyTo ?? this.config.replyEmail,
      });

      return {
        messageId: result.messageId,
        accepted: result.accepted.map(formatRecipient),
        rejected: result.rejected.map(formatRecipient),
      };
    } catch {
      throw new DependencyUnavailableError("Email delivery is currently unavailable");
    }
  }

  private defaultFrom(): MailAddress {
    if (!isMailConfigured(this.config)) {
      throw new DependencyUnavailableError("Email delivery is not configured");
    }

    return {
      name: this.config.fromName,
      address: this.config.fromEmail,
    };
  }

  private getTransporter(): MailTransporter {
    if (!isMailConfigured(this.config)) {
      throw new DependencyUnavailableError("Email delivery is not configured");
    }

    const options: SMTPTransport.Options = {
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
      ...(this.config.tlsCiphers
        ? {
            tls: {
              ciphers: this.config.tlsCiphers,
            },
          }
        : {}),
    };

    this.transporter ??= this.createTransport(options);
    return this.transporter;
  }
}

export const mailService = new MailService(env.mail);
