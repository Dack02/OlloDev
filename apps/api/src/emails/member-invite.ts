/**
 * Email template: Member Invitation
 * Sent when a user is invited to join an organization.
 */

export interface MemberInviteProps {
  orgName: string;
  inviterName: string;
  role: string;
  actionUrl?: string;
  isNewUser?: boolean;
}

export function renderMemberInvite(props: MemberInviteProps): string {
  const { orgName, inviterName, role, actionUrl, isNewUser } = props;

  const ctaLabel = isNewUser ? 'Accept Invitation' : 'Go to Workspace';
  const description = isNewUser
    ? `${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>. Click the button below to create your account and get started.`
    : `${inviterName} has added you to <strong>${orgName}</strong> as a <strong>${role}</strong>. You can access the workspace right away.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to ${orgName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${orgName}</p>
              <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0;">You've been invited</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 40px;">
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
                ${description}
              </p>
              ${actionUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#111827;border-radius:6px;">
                    <a href="${actionUrl}" style="display:inline-block;padding:10px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:6px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Workspace</p>
                    <p style="font-size:16px;font-weight:500;color:#111827;margin:0;">${orgName}</p>
                    <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">Role: ${role}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="font-size:13px;color:#9ca3af;margin:0;">
                You're receiving this because ${inviterName} invited you to ${orgName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
