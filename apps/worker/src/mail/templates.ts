function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderedMail = { subject: string; html: string; text: string };

export function renderNotificationMail(input: {
  title: string;
  body: string;
  actionUrl?: string;
}): RenderedMail {
  const { title, body, actionUrl } = input;
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const action = actionUrl
    ? `<div style="margin-top:28px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:999px;background:#263d2e;padding:13px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open in Luraba</a></div>`
    : "";

  return {
    subject: title,
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f3f1eb;color:#1d211c;font-family:Georgia,'Times New Roman',serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 16px;background:#f3f1eb;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;overflow:hidden;border:1px solid #d8d5cc;border-radius:16px;background:#fffdf8;">
                  <tr>
                    <td style="padding:24px 32px;border-bottom:1px solid #e5e1d8;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;">Luraba</td>
                  </tr>
                  <tr>
                    <td style="padding:36px 32px;">
                      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;">${safeTitle}</h1>
                      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#4c514a;">${safeBody}</p>
                      ${action}
                      <p style="margin:28px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#747970;">You can choose which alerts you get under Settings → Notifications.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `.trim(),
    text: [title, "", body, ...(actionUrl ? ["", actionUrl] : [])].join("\n"),
  };
}
