export type EmailEvent = 
  | "ORDER_CREATED"
  | "PAYMENT_CONFIRMED"
  | "ORDER_ACCEPTED"
  | "PRODUCTION_STARTED"
  | "READY_FOR_PICKUP"
  | "ORDER_COMPLETED";

export interface EmailPayload {
  to: string;
  orderNumber: string;
  studentName: string;
  details?: Record<string, unknown>;
}

export async function sendOrderEmail(event: EmailEvent, payload: EmailPayload): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Clean Adapter Pattern fallback: Returns unconfigured state without throwing or pretending
    return {
      sent: false,
      reason: "RESEND_API_KEY is not configured in environment variables. Email adapter bypassed safely.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "CPE & IoT Sportswear <noreply@cpe-iot.app>",
        to: payload.to,
        subject: `[CPE & IoT] อัปเดตคำสั่งซื้อ #${payload.orderNumber} (${event})`,
        html: `
          <div font-family="sans-serif">
            <h2>สวัสดีคุณ ${payload.studentName}</h2>
            <p>คำสั่งซื้อหมายเลข <strong>#${payload.orderNumber}</strong> ได้รับการอัปเดตสถานะเป็น: <strong>${event}</strong></p>
            <p>ขอบคุณที่ใช้บริการระบบสั่งซื้อเสื้อกีฬาสาขาวิศวกรรมคอมพิวเตอร์และระบบ IoT</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json();
      return { sent: false, reason: errJson.message || "Resend API call failed" };
    }

    return { sent: true };
  } catch (error: any) {
    return { sent: false, reason: error?.message || "Email service error" };
  }
}
