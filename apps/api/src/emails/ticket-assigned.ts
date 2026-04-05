/**
 * Email template: Ticket Assigned
 * Sent to the agent when a ticket is assigned to them.
 */

export interface TicketAssignedProps {
  ticketSubject: string;
  ticketId: string;
  assigneeName: string;
  assignedBy: string;
  priority: string;
  dashboardUrl?: string;
  orgName?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function renderTicketAssigned(props: TicketAssignedProps): string {
  const { ticketSubject, ticketId, assigneeName, assignedBy, priority, dashboardUrl, orgName } = props;
  const shortId = ticketId.slice(0, 8);
  const priColor = PRIORITY_COLORS[priority] ?? '#3b82f6';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket Assigned</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${orgName ?? 'Support'}</p>
              <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0;">Ticket assigned to you</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;">
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
                Hi ${assigneeName},
              </p>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
                ${assignedBy} assigned a ticket to you.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:6px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Ticket #${shortId}</p>
                    <p style="font-size:16px;font-weight:500;color:#111827;margin:0 0 8px;">${ticketSubject}</p>
                    <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:500;color:#fff;background:${priColor};">
                      ${priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                  </td>
                </tr>
              </table>
              ${dashboardUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#111827;border-radius:6px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:10px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
                      Open Ticket
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="font-size:13px;color:#9ca3af;margin:0;">
                You're receiving this because a ticket was assigned to you.
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
