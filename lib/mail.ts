import nodemailer from "nodemailer";

interface BillMessageData {
  shopName: string;
  senderEmail: string;
  emailAppPassword: string;
  customerEmail: string;
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

export async function sendEmailReceipt(data: BillMessageData): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Create a Nodemailer transporter using standard Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: data.senderEmail,
        pass: data.emailAppPassword,
      },
    });

    // 2. Build the beautiful HTML template
    const itemLines = data.items
      .map(
        (i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea;">${i.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: center;">${i.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right;">₹${i.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eaeaea; text-align: right; font-weight: bold;">₹${i.total.toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const greeting = data.customerName ? `Hi ${data.customerName},` : "Hello!";

    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0d9669; padding: 32px 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">${data.shopName}</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">Digital Receipt #${data.billNumber}</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #374151; margin-top: 0;">${greeting}</p>
        <p style="font-size: 16px; color: #374151;">Thank you for your purchase! Your payment has been marked as <strong>${data.status}</strong>. Here is your receipt summary:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; color: #111827;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 8px; text-align: left; border-radius: 6px 0 0 6px;">Item</th>
              <th style="padding: 12px 8px; text-align: center;">Qty</th>
              <th style="padding: 12px 8px; text-align: right;">Price</th>
              <th style="padding: 12px 8px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemLines}
          </tbody>
        </table>
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 2px dashed #eaeaea;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #4b5563;">
            <span>Subtotal</span>
            <span>₹${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.taxAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #4b5563;">
            <span>Tax</span>
            <span>₹${data.taxAmount.toFixed(2)}</span>
          </div>` : ''}
          ${data.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #4b5563;">
            <span>Discount</span>
            <span style="color: #ef4444;">-₹${data.discount.toFixed(2)}</span>
          </div>` : ''}
          
          <div style="display: flex; justify-content: space-between; margin-top: 16px; font-size: 20px; font-weight: bold; color: #111827;">
            <span>Total Checked Out</span>
            <span style="color: #0d9669;">₹${data.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
          <a href="${data.receiptUrl}" style="background-color: #0d9669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View Smart Receipt</a>
        </div>
      </div>
      
      <div style="background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #eaeaea;">
        <p style="margin: 0;">Powered by EcoReceipt Enterprise</p>
        <p style="margin: 4px 0 0 0;">An automated, eco-friendly digital billing solution.</p>
      </div>
    </div>
    `;

    // 3. Send email gracefully
    const info = await transporter.sendMail({
      from: `"${data.shopName}" <${data.senderEmail}>`, // sender address
      to: data.customerEmail, // list of receivers
      subject: `Receipt ${data.billNumber} from ${data.shopName}`, // Subject line
      html: htmlContent, // html body
    });

    console.log("Message sent successfully via Nodemailer: %s", info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error("Nodemailer error:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}
