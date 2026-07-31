import { householdInvitationTemplateInputSchema } from './mail.schemas';
import type { HouseholdInvitationTemplateInput, RenderedMail } from './mail.types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderHouseholdInvitation(input: HouseholdInvitationTemplateInput): RenderedMail {
  const { householdName, inviterName, inviteUrl } =
    householdInvitationTemplateInputSchema.parse(input);
  const safeHouseholdName = escapeHtml(householdName);
  const safeInviterName = inviterName ? escapeHtml(inviterName) : undefined;
  const safeInviteUrl = escapeHtml(inviteUrl);
  const invitationCopy = safeInviterName
    ? `${safeInviterName} invited you to join ${safeHouseholdName} on Luraba.`
    : `You have been invited to join ${safeHouseholdName} on Luraba.`;
  const textInvitationCopy = inviterName
    ? `${inviterName} invited you to join ${householdName} on Luraba.`
    : `You have been invited to join ${householdName} on Luraba.`;

  return {
    subject: `You're invited to join ${householdName} on Luraba`,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f3f1eb;color:#1d211c;font-family:Georgia,'Times New Roman',serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:#f3f1eb;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;overflow:hidden;border:1px solid #d8d5cc;border-radius:16px;background:#fffdf8;">
                  <tr>
                    <td style="padding:24px 32px;border-bottom:1px solid #e5e1d8;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;">
                      Luraba
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:36px 32px;">
                      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;">Join ${safeHouseholdName}</h1>
                      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#4c514a;">${invitationCopy}</p>
                      <div style="margin-top:28px;">
                        <a href="${safeInviteUrl}" style="display:inline-block;border-radius:999px;background:#263d2e;padding:13px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Accept invitation</a>
                      </div>
                      <p style="margin:28px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#747970;">
                        If the button does not work, copy and paste this link into your browser:<br>
                        <a href="${safeInviteUrl}" style="color:#263d2e;word-break:break-all;">${safeInviteUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `.trim(),
    text: `${textInvitationCopy}\n\nAccept the invitation:\n${inviteUrl}`,
  };
}
