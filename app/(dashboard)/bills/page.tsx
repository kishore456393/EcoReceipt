"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  FileText,
  Eye,
  Loader2,
  QrCode,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Bill {
  id: string;
  billNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: string;
  qrToken: string;
  createdAt: string;
  items: { id: string; name: string; price: number; quantity: number; total: number }[];
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    fetch("/api/network-url")
      .then((r) => r.json())
      .then((d) => setBaseUrl(d.url))
      .catch(() => setBaseUrl(window.location.origin));
  }, []);

  const fetchBills = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/bills?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBills(data.bills || []);
      }
    } catch {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const viewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setDetailOpen(true);
  };

  const updateBillStatus = async (billId: string, status: string) => {
    setUpdatingStatus(billId);
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (status === "PAID" && data.smsSent) {
        toast.success("Bill marked as PAID — SMS sent to customer!");
      } else if (status === "PAID" && data.smsError) {
        toast.success("Bill marked as PAID");
        toast.error(`SMS failed: ${data.smsError}`);
      } else if (status === "PAID" && data.smsSkipReason) {
        toast.success("Bill marked as PAID");
        toast.info(`SMS not sent: ${data.smsSkipReason}. Use WhatsApp to share the bill.`);
      } else {
        toast.success(`Bill marked as ${status}`);
      }
      fetchBills();
      if (selectedBill?.id === billId) {
        setSelectedBill((prev) => prev ? { ...prev, status } : null);
      }
    } catch {
      toast.error("Failed to update bill status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const verifySelfCheckoutBill = async (billId: string, action: "verify" | "cancel") => {
    setUpdatingStatus(billId);
    try {
      const res = await fetch(`/api/bills`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId, action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "verify" ? "Self-checkout verified and marked paid!" : "Self-checkout cancelled.");
      fetchBills();
      if (selectedBill?.id === billId) {
        setSelectedBill((prev) => prev ? { ...prev, status: action === "verify" ? "PAID" : "CANCELLED" } : null);
      }
    } catch {
      toast.error(`Failed to ${action} self-checkout bill`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Paid</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "PENDING_VERIFICATION":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200">Action Required</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const receiptUrl = (token: string) => `${baseUrl}/receipt/${token}`;

  const buildWhatsAppMessage = (bill: Bill) => {
    const itemLines = bill.items.map((i) => `  ${i.name} x${i.quantity} = ₹${i.total.toFixed(0)}`).join("\n");
    let msg = `🧾 *EcoReceipt*\nBill: *${bill.billNumber}*\n`;
    if (bill.customerName) msg += `Customer: ${bill.customerName}\n`;
    msg += `━━━━━━━━━━━━━━\n${itemLines}\n━━━━━━━━━━━━━━\n`;
    if (bill.discount > 0) msg += `Discount: -₹${bill.discount.toFixed(0)}\n`;
    if (bill.taxAmount > 0) msg += `Tax: ₹${bill.taxAmount.toFixed(0)}\n`;
    msg += `*TOTAL: ₹${bill.total.toFixed(2)}*\n`;
    msg += bill.status === "PAID" ? `✅ *Payment Received*\n` : `⏳ Payment Pending\n`;
    msg += `\n📱 View receipt: ${receiptUrl(bill.qrToken)}`;
    return msg;
  };

  const sendWhatsApp = (bill: Bill) => {
    const msg = encodeURIComponent(buildWhatsAppMessage(bill));
    const phone = bill.customerPhone ? bill.customerPhone.replace(/[\s\-\+]/g, "") : "";
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  const sendSMS = (bill: Bill) => {
    const itemLines = bill.items.map((i) => `${i.name} x${i.quantity}=Rs.${i.total.toFixed(0)}`).join(", ");
    const msg = `${bill.billNumber} | ${itemLines} | Total: Rs.${bill.total.toFixed(2)} | ${bill.status} | ${receiptUrl(bill.qrToken)}`;
    const phone = bill.customerPhone || "";
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_self");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bill History</h2>
        <p className="text-muted-foreground">
          View and manage all generated bills.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bill number, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">Self-Checkout</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bills.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText size={40} />
              <p>No bills found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead className="hidden sm:table-cell">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.billNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {bill.customerName || "Walk-in"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(bill.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(bill.status)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{bill.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => viewBill(bill)} title="View details">
                          <Eye size={16} />
                        </Button>
                        {bill.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-600"
                              disabled={updatingStatus === bill.id}
                              onClick={() => updateBillStatus(bill.id, "PAID")}
                              title="Mark as paid"
                            >
                              <CheckCircle2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              disabled={updatingStatus === bill.id}
                              onClick={() => updateBillStatus(bill.id, "CANCELLED")}
                              title="Cancel bill"
                            >
                              <XCircle size={16} />
                            </Button>
                          </>
                        )}
                        {bill.status === "PENDING_VERIFICATION" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300"
                              disabled={updatingStatus === bill.id}
                              onClick={() => verifySelfCheckoutBill(bill.id, "verify")}
                              title="Verify Self-Checkout"
                            >
                              Verify
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              disabled={updatingStatus === bill.id}
                              onClick={() => verifySelfCheckoutBill(bill.id, "cancel")}
                              title="Reject Self-Checkout"
                            >
                              <XCircle size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bill Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bill Details - {selectedBill?.billNumber}</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedBill.createdAt).toLocaleString("en-IN")}
                </span>
                {getStatusBadge(selectedBill.status)}
              </div>
              {selectedBill.customerName && (
                <p className="text-sm">Customer: <strong>{selectedBill.customerName}</strong></p>
              )}

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBill.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{item.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span><span>₹{selectedBill.subtotal.toFixed(2)}</span>
                </div>
                {selectedBill.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span><span>₹{selectedBill.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {selectedBill.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span><span>-₹{selectedBill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span><span>₹{selectedBill.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="rounded-lg border-2 border-primary/20 p-3 bg-white">
                  <QRCodeSVG value={receiptUrl(selectedBill.qrToken)} size={120} level="H" fgColor="#0d9669" />
                </div>
                <p className="text-xs text-muted-foreground">Receipt QR Code</p>
              </div>

              {/* Send bill via WhatsApp / SMS */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white"
                  onClick={() => sendWhatsApp(selectedBill)}
                >
                  <MessageCircle size={16} className="mr-2" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => sendSMS(selectedBill)}
                >
                  <Send size={16} className="mr-2" />
                  SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
