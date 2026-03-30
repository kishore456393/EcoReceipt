import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ReceiptData {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  gstNumber?: string;
  billNumber: string;
  date: string;
  items: { name: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  total: number;
  customerName?: string;
  status: string;
}

// Color palette
const C = {
  primary: [13, 100, 70] as [number, number, number],
  primaryBg: [232, 245, 239] as [number, number, number],
  dark: [30, 35, 45] as [number, number, number],
  text: [55, 65, 81] as [number, number, number],
  muted: [120, 130, 145] as [number, number, number],
  border: [210, 215, 220] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [16, 150, 100] as [number, number, number],
  warning: [200, 130, 10] as [number, number, number],
  discount: [220, 55, 55] as [number, number, number],
  altRow: [248, 250, 252] as [number, number, number],
};

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  // Use A5 portrait for a clean receipt look
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pw = doc.internal.pageSize.getWidth(); // ~148mm
  const m = 12; // margin
  const cw = pw - m * 2; // content width
  let y = 10;

  // ═══ TOP ACCENT BAR ═══
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pw, 3, "F");

  // ═══ SHOP HEADER ═══
  y = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.text(data.shopName, pw / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);

  if (data.shopAddress) {
    doc.text(data.shopAddress, pw / 2, y, { align: "center" });
    y += 4;
  }
  if (data.shopPhone) {
    doc.text(`Tel: ${data.shopPhone}`, pw / 2, y, { align: "center" });
    y += 4;
  }
  if (data.gstNumber) {
    doc.text(`GSTIN: ${data.gstNumber}`, pw / 2, y, { align: "center" });
    y += 4;
  }

  // ═══ DASHED LINE ═══
  y += 1;
  drawDashedLine(doc, m, y, pw - m);
  y += 5;

  // ═══ RECEIPT LABEL ═══
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.primary);
  doc.text("RECEIPT", pw / 2, y, { align: "center" });
  y += 6;

  // ═══ BILL INFO (two-column layout) ═══
  const leftX = m;
  const rightX = pw - m;

  doc.setFontSize(8);
  doc.setTextColor(...C.text);

  // Row 1: Bill # and Date
  doc.setFont("helvetica", "bold");
  doc.text("Bill No:", leftX, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.billNumber, leftX + 15, y);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", rightX - 35, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.date, rightX, y, { align: "right" });
  y += 4.5;

  // Row 2: Customer and Status
  if (data.customerName) {
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.customerName, leftX + 18, y);
  }

  // Status badge
  const isPaid = data.status === "PAID";
  const statusLabel = isPaid ? "PAID" : "PENDING";
  const statusColor = isPaid ? C.success : C.warning;
  const badgeW = 18;
  const badgeX = rightX - badgeW;
  doc.setFillColor(...statusColor);
  doc.roundedRect(badgeX, y - 3, badgeW, 4.5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.white);
  doc.text(statusLabel, badgeX + badgeW / 2, y - 0.3, { align: "center" });

  y += 5;

  // ═══ DASHED LINE ═══
  drawDashedLine(doc, m, y, pw - m);
  y += 3;

  // ═══ ITEMS TABLE ═══
  autoTable(doc, {
    startY: y,
    head: [["#", "ITEM", "QTY", "RATE (₹)", "AMT (₹)"]],
    body: data.items.map((item, i) => [
      (i + 1).toString(),
      item.name,
      item.quantity.toString(),
      item.price.toFixed(2),
      item.total.toFixed(2),
    ]),
    theme: "plain",
    headStyles: {
      fillColor: C.primaryBg,
      textColor: C.primary,
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: C.dark,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      lineColor: C.border,
      lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
    },
    alternateRowStyles: {
      fillColor: C.altRow,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },   // #
      1: { cellWidth: "auto" },                  // Item name
      2: { cellWidth: 12, halign: "center" },    // Qty
      3: { cellWidth: 20, halign: "right" },     // Rate
      4: { cellWidth: 20, halign: "right", fontStyle: "bold" }, // Amt
    },
    margin: { left: m, right: m },
    tableLineColor: C.border,
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // ═══ TOTALS SECTION ═══
  const labelX = pw / 2 + 5;
  const valX = rightX;

  doc.setFontSize(8);

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.text);
  doc.text("Subtotal", labelX, y, { align: "right" });
  doc.text(`₹${data.subtotal.toFixed(2)}`, valX, y, { align: "right" });
  y += 4;

  // Tax
  if (data.taxAmount > 0) {
    doc.text(`Tax (${data.taxPercent}%)`, labelX, y, { align: "right" });
    doc.text(`₹${data.taxAmount.toFixed(2)}`, valX, y, { align: "right" });
    y += 4;
  }

  // Discount
  if (data.discount > 0) {
    doc.setTextColor(...C.discount);
    doc.text("Discount", labelX, y, { align: "right" });
    doc.text(`-₹${data.discount.toFixed(2)}`, valX, y, { align: "right" });
    doc.setTextColor(...C.text);
    y += 4;
  }

  // Divider before total
  y += 1;
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.4);
  doc.line(labelX - 10, y, valX, y);
  y += 5;

  // Grand total bar
  const totalBarH = 9;
  doc.setFillColor(...C.primary);
  doc.roundedRect(m, y - 4, cw, totalBarH, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text("TOTAL", m + 5, y + 1.5);
  doc.text(`₹${data.total.toFixed(2)}`, rightX - 5, y + 1.5, { align: "right" });

  y += totalBarH + 4;

  // ═══ SAVINGS (if discount) ═══
  if (data.discount > 0) {
    doc.setFillColor(255, 250, 235);
    doc.roundedRect(m, y - 2.5, cw, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.warning);
    doc.text(
      `You saved Rs.${data.discount.toFixed(2)} on this purchase!`,
      pw / 2,
      y + 1,
      { align: "center" }
    );
    y += 8;
  }

  // ═══ DASHED LINE ═══
  drawDashedLine(doc, m, y, pw - m);
  y += 5;

  // ═══ THANK YOU ═══
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.text("Thank you for your purchase!", pw / 2, y, { align: "center" });
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text("We appreciate your business.", pw / 2, y, { align: "center" });
  y += 7;

  // ═══ ECO FOOTER ═══
  doc.setFillColor(...C.primaryBg);
  doc.roundedRect(m, y - 2.5, cw, 8, 1.5, 1.5, "F");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.primary);
  doc.text("This is a digital receipt.", pw / 2, y + 0.5, { align: "center" });
  doc.text("Thank you for helping save the environment!", pw / 2, y + 4, {
    align: "center",
  });
  y += 10;

  // ═══ POWERED BY ═══
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text("Powered by EcoReceipt", pw / 2, y, { align: "center" });

  // ═══ BOTTOM ACCENT BAR ═══
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.primary);
  doc.rect(0, pageH - 2, pw, 2, "F");

  return doc;
}

function drawDashedLine(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  const dashLen = 1.2;
  const gapLen = 1.2;
  let cx = x1;
  while (cx < x2) {
    const end = Math.min(cx + dashLen, x2);
    doc.line(cx, y, end, y);
    cx = end + gapLen;
  }
}
