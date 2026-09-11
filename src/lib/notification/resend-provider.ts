export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string; // base64 string
  }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Transactional email delivery via Resend API.
 * Uses native fetch with zero external package dependencies.
 * If RESEND_API_KEY is not configured (e.g. local dev), falls back to safe simulation logging.
 */
export async function sendTransactionalEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Badminton Academy <bookings@badmintonacademy.in>";

  // Development / Test fallback when API key is not configured
  if (!apiKey || apiKey === "mock" || apiKey === "test") {
    console.log(`[NotificationService] Mock delivery to ${params.to} - Subject: "${params.subject}"`);
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}`;
      console.error("[NotificationService] Resend API error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: any) {
    console.error("[NotificationService] Network error sending email:", err);
    return {
      success: false,
      error: err.message || "Network error sending email.",
    };
  }
}
