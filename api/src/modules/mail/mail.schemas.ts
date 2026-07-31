import { z } from 'zod';

const recipientSchema = z.union([
  z.email(),
  z.array(z.email()).min(1, 'At least one recipient is required'),
]);

export const mailAddressSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.email(),
});

export const sendMailPayloadSchema = z.object({
  to: recipientSchema,
  subject: z.string().trim().min(1, 'Subject is required'),
  html: z.string().min(1, 'HTML body is required'),
  text: z.string().min(1, 'Text body cannot be empty').optional(),
  from: mailAddressSchema.optional(),
  replyTo: z.email().optional(),
});

export const householdInvitationTemplateInputSchema = z.object({
  householdName: z.string().trim().min(1, 'Household name is required'),
  inviterName: z.string().trim().min(1, 'Inviter name cannot be empty').optional(),
  inviteUrl: z.url('Invalid invitation URL'),
});
