import { db } from "../db";
import { sendTransactionalEmail } from "./resend-provider";
import { generateBookingInvoicePdf } from "../invoice/pdf-service";
import { createBookingAccessTokens, hashToken } from "../access-token";

/**
 * Dispatches the booking confirmation email with attached PDF invoice asynchronously and idempotently.
 * Never throws or fails the parent transaction if email delivery encounters issues.
 */
export async function sendBookingConfirmationNotification(
  bookingId: string,
  rawInvoiceTokenHint?: string
): Promise<{ success: boolean; error?: string; reason?: string }> {
  try {
    // 1. Fetch booking with full relation graph
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: true,
        resource: true,
        customer: true,
        business: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        accessTokens: true,
      },
    });

    if (!booking) {
      return { success: false, error: "Booking record not found." };
    }

    const customerEmail = booking.customer.email?.trim();
    if (!customerEmail) {
      // Customer provided no email
      return { success: false, error: "No customer email available." };
    }

    // 2. Idempotency Check: verify if confirmation email was already successfully delivered
    const existingNotification = await db.notification.findFirst({
      where: {
        bookingId: booking.id,
        type: "booking_confirmation",
        status: "sent",
      },
    });

    if (existingNotification) {
      console.log(`[NotificationService] Email already sent for booking ${booking.bookingNumber}. Skipping.`);
      return { success: true, reason: "already_sent" };
    }

    // 3. Ensure 7-day secure access tokens exist for this booking
    let rawBookingToken: string | undefined;
    let rawInvoiceToken: string | undefined = rawInvoiceTokenHint;

    // Check if tokens exist in database
    const existingTokens = await db.bookingAccessToken.findMany({
      where: { bookingId: booking.id },
    });

    if (existingTokens.length === 0) {
      const generated = await createBookingAccessTokens(booking.id, booking.createdAt);
      rawBookingToken = generated.rawBookingToken;
      rawInvoiceToken = generated.rawInvoiceToken;
    }

    // 4. Generate the official PDF invoice buffer
    const pdfBuffer = await generateBookingInvoicePdf({
      bookingNumber: booking.bookingNumber,
      bookingDateStr: booking.dateStr,
      startTimeStr: booking.startTimeStr,
      endTimeStr: booking.endTimeStr,
      total: booking.total,
      subtotal: booking.subtotal,
      tax: booking.tax,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      createdAt: booking.createdAt,
      brandName: booking.business?.name || "Nitish Badminton Academy",
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone,
        email: booking.customer.email,
      },
      venue: {
        name: booking.venue.name,
        address: booking.venue.address,
        city: booking.venue.city,
        phone: booking.venue.phone,
      },
      resource: {
        name: booking.resource.name,
        resourceType: booking.resource.resourceType,
      },
    });

    // 5. Create or update Notification record to pending
    const notification = await db.notification.create({
      data: {
        businessId: booking.businessId,
        bookingId: booking.id,
        customerId: booking.customerId,
        type: "booking_confirmation",
        channel: "email",
        recipient: customerEmail,
        status: "pending",
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const passUrl = rawBookingToken ? `${appUrl}/booking/${rawBookingToken}` : `${appUrl}`;

    // 6. Build clean, brand-compliant HTML email (strictly zero third-party ads/logos)
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed - ${booking.bookingNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
                BADMINTON ACADEMY
              </h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 500;">
                Official Reservation Confirmation
              </p>
            </td>
          </tr>

          <!-- Confirmation Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px;">
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <span style="color: #166534; font-weight: 700; font-size: 15px; display: block;">
                  Booking Confirmed ✓
                </span>
                <span style="color: #15803d; font-size: 13px; margin-top: 4px; display: block;">
                  Your court reservation is secured. Your official PDF invoice is attached.
                </span>
              </div>

              <!-- Highlights Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Booking Reference</span>
                    <div style="font-size: 18px; font-weight: 800; color: #059669; margin-top: 2px;">${booking.bookingNumber}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Venue & Location</span>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${booking.venue.name}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 2px;">${booking.venue.address}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Court & Timing</span>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${booking.resource.name}</div>
                    <div style="font-size: 13px; color: #475569; margin-top: 2px;">Date: <strong>${booking.dateStr}</strong> | Time: <strong>${booking.startTimeStr} to ${booking.endTimeStr}</strong> (60 mins)</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Total Paid</span>
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">INR ${booking.total.toFixed(2)} (${booking.paymentStatus.toUpperCase()})</div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              ${
                rawBookingToken
                  ? `<div style="text-align: center; margin-bottom: 24px;">
                      <a href="${passUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; display: inline-block;">
                        Open Match Pass (Mobile Pass) →
                      </a>
                    </div>`
                  : ""
              }

              <!-- Security Policy Note -->
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; margin: 0;">
                For security, your online booking pass link is active for 7 days from creation. Your invoice PDF is attached for your permanent records.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0; font-size: 11px;">
                Badminton Academy • Please bring non-marking badminton shoes for court access.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // 7. Dispatch email via provider
    const sendResult = await sendTransactionalEmail({
      to: customerEmail,
      subject: `Booking Confirmed: ${booking.bookingNumber} at ${booking.venue.name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${booking.bookingNumber}-invoice.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    // 8. Update notification record
    if (sendResult.success) {
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "sent",
          providerMessageId: sendResult.messageId,
          attemptCount: { increment: 1 },
          sentAt: new Date(),
        },
      });
      return { success: true };
    } else {
      await db.notification.update({
        where: { id: notification.id },
        data: {
          status: "failed",
          lastError: sendResult.error,
          attemptCount: { increment: 1 },
        },
      });
      return { success: false, error: sendResult.error };
    }
  } catch (error: any) {
    console.error("[NotificationService] Uncaught error:", error);
    return { success: false, error: error.message || "Failed to process notification." };
  }
}
