/**
 * Email template: Ticket Status Updated
 * Sent to the requester when the ticket status changes.
 */

export interface TicketStatusUpdatedProps {
  ticketSubject: string;
  ticketId: string;
  requesterName: string;
  previousStatus: string;
  newStatus: string;
  portalUrl?: string;
  orgName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  pending: '#f59e0b',
  in_progress: '#8b5cf6',
  resolved: '#10b981',
  closed: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function renderTicketStatusUpdated(props: TicketStatusUpdatedProps): string {
  const { ticketSubject, ticketId, requesterName, previousStatus, newStatus, portalUrl, orgName } = props;
  const shortId = ticketId.slice(0, 8);
  const color = STATUS_COLORS[newStatus] ?? '#6b7280';
  const label = STATUS_LABELS[newStatus] ?? newStatus;
  const prevLabel = STATUS_LABELS[previousStatus] ?? previousStatus;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket Updated</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${orgName ?? 'Support'}</p>
              <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0;">Ticket status updated</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;">
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
                Hi ${requesterName},
              </p>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
                The status of your ticket has been updated.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:6px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Ticket #${shortId}</p>
                    <p style="font-size:16px;font-weight:500;color:#111827;margin:0 0 12px;">${ticketSubject}</p>
                    <p style="font-size:14px;color:#6b7280;margin:0;">
                      ${prevLabel} &rarr;
                      <span style="color:${color};font-weight:600;">${label}</span>
                    </p>
                  </td>
                </tr>
              </table>
              ${portalUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#111827;border-radius:6px;">
                    <a href="${portalUrl}" style="display:inline-block;padding:10px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
                      View Ticket
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
                You're receiving this because you submitted a support request.
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
