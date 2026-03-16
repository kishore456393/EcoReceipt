interface BillMessageData {
  shopName: string;
  billNumber: string;
  items: { name: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: string;
  receiptUrl: string;
  customerName?: string;
}

export function formatBillSMS(data: BillMessageData): string {
  const itemLines = data.items
    .map((i) => `${i.name} x${i.quantity} = Rs.${i.total.toFixed(0)}`)
    .join("\n");

  let msg = `${data.shopName}\n`;
  msg += `Bill: ${data.billNumber}\n`;
  if (data.customerName) msg += `Customer: ${data.customerName}\n`;
  msg += `---\n`;
  msg += `${itemLines}\n`;
  msg += `---\n`;
  if (data.discount > 0) msg += `Discount: -Rs.${data.discount.toFixed(0)}\n`;
  if (data.taxAmount > 0) msg += `Tax: Rs.${data.taxAmount.toFixed(0)}\n`;
  msg += `TOTAL: Rs.${data.total.toFixed(2)}\n`;
  msg += `Status: ${data.status === "PAID" ? "PAID" : "PENDING"}\n`;
  msg += `\nView receipt: ${data.receiptUrl}`;
  msg += `\n\n- Powered by EcoReceipt`;

  return msg;
}

export function formatBillWhatsApp(data: BillMessageData): string {
  const itemLines = data.items
    .map((i) => `  ${i.name} x${i.quantity} = ₹${i.total.toFixed(0)}`)
    .join("\n");

  let msg = `🧾 *${data.shopName}*\n`;
  msg += `Bill: *${data.billNumber}*\n`;
  if (data.customerName) msg += `Customer: ${data.customerName}\n`;
  msg += `━━━━━━━━━━━━━━\n`;
  msg += `${itemLines}\n`;
  msg += `━━━━━━━━━━━━━━\n`;
  if (data.discount > 0) msg += `Discount: -₹${data.discount.toFixed(0)}\n`;
  if (data.taxAmount > 0) msg += `Tax: ₹${data.taxAmount.toFixed(0)}\n`;
  msg += `*TOTAL: ₹${data.total.toFixed(2)}*\n`;
  msg += data.status === "PAID" ? `✅ *Payment Received*\n` : `⏳ Payment Pending\n`;
  msg += `\n📱 View receipt: ${data.receiptUrl}`;

  return msg;
}

// Send SMS via Fast2SMS (free Indian SMS API)
export async function sendSMSFast2SMS(
  apiKey: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Clean phone number — remove +91, spaces, dashes
    const cleanPhone = phone.replace(/[\s\-\+]/g, "").replace(/^91/, "");

    if (cleanPhone.length !== 10) {
      return { success: false, error: "Invalid phone number" };
    }

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q", // Quick SMS (transactional)
        message: message,
        language: "english",
        flash: 0,
        numbers: cleanPhone,
      }),
    });

    const data = await res.json();

    if (data.return === true) {
      return { success: true };
    } else {
      return { success: false, error: data.message || "SMS sending failed" };
    }
  } catch (error) {
    console.error("Fast2SMS error:", error);
    return { success: false, error: "Failed to connect to SMS service" };
  }
}
