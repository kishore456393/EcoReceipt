"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/Logo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Download,
  Smartphone,
  Store,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface ReceiptData {
  id: string;
  billNumber: string;
  customerName: string | null;
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
  shop: {
    name: string;
    address: string | null;
    phone: string | null;
    gstNumber: string | null;
    upiId: string | null;
    upiName: string | null;
  };
  items: { id: string; name: string; price: number; quantity: number; total: number }[];
}

export default function ReceiptPage() {
  const params = useParams();
  const token = params.token as string;
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const res = await fetch(`/api/receipt/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Receipt not found. The QR code may be invalid or expired.");
          } else {
            setError("Failed to load receipt.");
          }
          return;
        }
        const data = await res.json();
        setReceipt(data);
      } catch {
        setError("Failed to load receipt. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchReceipt();
  }, [token]);

  const upiUrl = receipt?.shop.upiId
    ? `upi://pay?pa=${encodeURIComponent(receipt.shop.upiId)}&pn=${encodeURIComponent(receipt.shop.upiName || receipt.shop.name)}&am=${receipt.total}&cu=INR&tn=Bill-${encodeURIComponent(receipt.billNumber)}`
    : null;

  const handleDownloadPDF = async () => {
    if (!receipt) return;
    setDownloading(true);
    try {
      const { generateReceiptPDF } = await import("@/lib/generate-pdf");
      const doc = generateReceiptPDF({
        shopName: receipt.shop.name,
        shopAddress: receipt.shop.address || undefined,
        shopPhone: receipt.shop.phone || undefined,
        gstNumber: receipt.shop.gstNumber || undefined,
        billNumber: receipt.billNumber,
        date: new Date(receipt.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        items: receipt.items,
        subtotal: receipt.subtotal,
        taxPercent: receipt.taxPercent,
        taxAmount: receipt.taxAmount,
        discount: receipt.discount,
        total: receipt.total,
        customerName: receipt.customerName || undefined,
        status: receipt.status,
      });
      doc.save(`EcoReceipt-${receipt.billNumber}.pdf`);
      toast.success("Receipt downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Logo size="large" />
        <FileText size={48} className="text-muted-foreground" />
        <h1 className="text-xl font-bold">Receipt Not Found</h1>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/30 p-4">
      <div className="mx-auto max-w-lg space-y-4 py-4">
        {/* Header */}
        <div className="text-center">
          <Logo size="small" />
        </div>

        {/* Shop Info */}
        <Card>
          <CardContent className="pt-6 text-center space-y-1">
            <div className="flex justify-center mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Store size={24} className="text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold">{receipt.shop.name}</h2>
            {receipt.shop.address && (
              <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <MapPin size={14} /> {receipt.shop.address}
              </p>
            )}
            {receipt.shop.phone && (
              <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Phone size={14} /> {receipt.shop.phone}
              </p>
            )}
            {receipt.shop.gstNumber && (
              <p className="text-xs text-muted-foreground">GST: {receipt.shop.gstNumber}</p>
            )}
          </CardContent>
        </Card>

        {/* Bill Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bill Number</p>
                <p className="font-bold">{receipt.billNumber}</p>
              </div>
              <Badge
                className={
                  receipt.status === "PAID"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : ""
                }
                variant={receipt.status === "PAID" ? "default" : "secondary"}
              >
                {receipt.status === "PAID" && <CheckCircle size={12} className="mr-1" />}
                {receipt.status === "PENDING" && <Clock size={12} className="mr-1" />}
                {receipt.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(receipt.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {receipt.customerName && (
              <p className="text-sm mt-1">Customer: <strong>{receipt.customerName}</strong></p>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center w-16">Qty</TableHead>
                  <TableHead className="text-right w-20">Price</TableHead>
                  <TableHead className="text-right w-20">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({receipt.taxPercent}%)</span>
                <span>₹{receipt.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-emerald-600">-₹{receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">₹{receipt.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Actions */}
        <div className="space-y-3">
          {receipt.status === "PENDING" && upiUrl && (
            <a
              href={upiUrl}
              className="flex items-center justify-center gap-3 w-full h-14 text-lg font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Smartphone size={22} />
              Pay ₹{receipt.total.toFixed(2)} via UPI
            </a>
          )}

          {receipt.status === "PENDING" && !receipt.shop.upiId && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-4 text-amber-700 dark:text-amber-300">
              <Clock size={20} />
              <span className="font-semibold">Payment Pending — Pay at shop counter</span>
            </div>
          )}

          {receipt.status === "PAID" && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-700 dark:text-emerald-300">
              <CheckCircle size={20} />
              <span className="font-semibold">Payment Received</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12" onClick={handleDownloadPDF} disabled={downloading}>
              {downloading ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Download size={18} className="mr-2" />
              )}
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="h-12"
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: `Receipt ${receipt.billNumber}`,
                      url: window.location.href,
                    });
                  } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  } else {
                    // Fallback for HTTP on mobile where clipboard API is unavailable
                    const input = document.createElement("input");
                    input.value = window.location.href;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand("copy");
                    document.body.removeChild(input);
                    toast.success("Link copied!");
                  }
                } catch {
                  toast.error("Could not share or copy link");
                }
              }}
            >
              <CreditCard size={18} className="mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          Powered by EcoReceipt &middot; Digital receipts for a greener planet
        </p>
      </div>
    </div>
  );
}
