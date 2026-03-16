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

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.shopName, pageWidth / 2, y, { align: "center" });
  y += 7;

  if (data.shopAddress) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(data.shopAddress, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  if (data.shopPhone) {
    doc.setFontSize(9);
    doc.text(`Phone: ${data.shopPhone}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  if (data.gstNumber) {
    doc.setFontSize(9);
    doc.text(`GST: ${data.gstNumber}`, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  // Separator
  doc.setLineWidth(0.5);
  doc.line(10, y, pageWidth - 10, y);
  y += 6;

  // Bill details
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Bill #: ${data.billNumber}`, 10, y);
  doc.text(`Date: ${data.date}`, pageWidth - 10, y, { align: "right" });
  y += 5;

  if (data.customerName) {
    doc.setFont("helvetica", "normal");
    doc.text(`Customer: ${data.customerName}`, 10, y);
    y += 5;
  }

  doc.text(`Status: ${data.status}`, 10, y);
  y += 6;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["Item", "Qty", "Price", "Total"]],
    body: data.items.map((item) => [
      item.name,
      item.quantity.toString(),
      `₹${item.price.toFixed(2)}`,
      `₹${item.total.toFixed(2)}`,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 10, right: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const totalsX = pageWidth - 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Subtotal:`, totalsX - 40, y);
  doc.text(`₹${data.subtotal.toFixed(2)}`, totalsX, y, { align: "right" });
  y += 5;

  if (data.taxAmount > 0) {
    doc.text(`Tax (${data.taxPercent}%):`, totalsX - 40, y);
    doc.text(`₹${data.taxAmount.toFixed(2)}`, totalsX, y, { align: "right" });
    y += 5;
  }

  if (data.discount > 0) {
    doc.text(`Discount:`, totalsX - 40, y);
    doc.text(`-₹${data.discount.toFixed(2)}`, totalsX, y, { align: "right" });
    y += 5;
  }

  doc.setLineWidth(0.3);
  doc.line(totalsX - 45, y, totalsX, y);
  y += 5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total:`, totalsX - 40, y);
  doc.text(`₹${data.total.toFixed(2)}`, totalsX, y, { align: "right" });
  y += 10;

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Powered by EcoReceipt - Say Goodbye to Paper Receipts", pageWidth / 2, y, {
    align: "center",
  });

  return doc;
}
