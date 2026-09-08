import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { z } from "zod";
import type { MailConfig } from "./mail.config";
import type {
  householdInvitationTemplateInputSchema,
  mailAddressSchema,
  sendMailPayloadSchema,
} from "./mail.schemas";

export type MailAddress = z.infer<typeof mailAddressSchema>;
export type SendMailPayload = z.infer<typeof sendMailPayloadSchema>;
export type HouseholdInvitationTemplateInput = z.infer<
  typeof householdInvitationTemplateInputSchema
>;

export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

export type MailTransporter = Pick<
  Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>,
  "sendMail"
>;

export type MailTransportFactory = (options: SMTPTransport.Options) => MailTransporter;

export type { MailConfig };
