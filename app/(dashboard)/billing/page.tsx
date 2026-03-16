"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Loader2,
  ShoppingCart,
  Share2,
  Printer,
  RotateCcw,
  MessageCircle,
  Send,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Item {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  category: string;
  unit: string;
  stock: number;
}

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export default function BillingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxPercent, setTaxPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<{
    billNumber: string;
    qrToken: string;
    total: number;
  } | null>(null);
  // Network-accessible base URL (LAN IP in dev, real domain in prod)
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    fetch("/api/network-url")
      .then((r) => r.json())
      .then((d) => setBaseUrl(d.url))
      .catch(() => setBaseUrl(window.location.origin));
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/items?${params}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch("/api/shop");
        if (res.ok) {
          const data = await res.json();
          if (data?.taxPercent) setTaxPercent(data.taxPercent);
        }
      } catch {}
    }
    fetchShop();
  }, []);

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.itemId === item.id
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
            : c
        );
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1, total: item.price }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.itemId !== itemId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          return { ...c, quantity: newQty, total: newQty * c.price };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.total, 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
  const total = subtotal - discountAmount + taxAmount;

  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      toast.error("Add items to cart first");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            itemId: c.itemId,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
          })),
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          discount: discountAmount,
          taxPercent,
        }),
      });

      if (!res.ok) throw new Error("Failed to create bill");
      const bill = await res.json();
      setGeneratedBill({
        billNumber: bill.billNumber,
        qrToken: bill.qrToken,
        total: bill.total,
      });
      setQrModalOpen(true);
      toast.success("Bill generated successfully!");
    } catch {
      toast.error("Failed to generate bill");
    } finally {
      setGenerating(false);
    }
  };

  const handleNewBill = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount("0");
    setGeneratedBill(null);
    setQrModalOpen(false);
    fetchItems();
  };

  const receiptUrl = generatedBill
    ? `${baseUrl}/receipt/${generatedBill.qrToken}`
    : "";

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Receipt ${generatedBill?.billNumber}`,
        text: `Your digital receipt: ₹${generatedBill?.total}`,
        url: receiptUrl,
      });
    } else {
      await navigator.clipboard.writeText(receiptUrl);
      toast.success("Receipt link copied to clipboard!");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>QR Code - ${generatedBill?.billNumber}</title>
        <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
        h2{margin-bottom:8px;}p{color:#666;}</style></head><body>
        <h2>${generatedBill?.billNumber}</h2>
        <p>Total: ₹${generatedBill?.total?.toFixed(2)}</p>
        <img src="${document.querySelector<SVGElement>("#qr-code-svg")?.outerHTML ? `data:image/svg+xml,${encodeURIComponent(document.querySelector<SVGElement>("#qr-code-svg")?.outerHTML || "")}` : ""}" />
        <p style="margin-top:16px;">Scan to view receipt & pay</p>
        <script>setTimeout(()=>window.print(),500)</script></body></html>
      `);
    }
  };

  const sendWhatsAppFromBilling = () => {
    if (!generatedBill) return;
    const itemLines = cart.map((i) => `  ${i.name} x${i.quantity} = ₹${i.total.toFixed(0)}`).join("\n");
    let msg = `🧾 *EcoReceipt*\nBill: *${generatedBill.billNumber}*\n`;
    if (customerName.trim()) msg += `Customer: ${customerName.trim()}\n`;
    msg += `━━━━━━━━━━━━━━\n${itemLines}\n━━━━━━━━━━━━━━\n`;
    if (discountAmount > 0) msg += `Discount: -₹${discountAmount.toFixed(0)}\n`;
    if (taxAmount > 0) msg += `Tax: ₹${taxAmount.toFixed(0)}\n`;
    msg += `*TOTAL: ₹${generatedBill.total.toFixed(2)}*\n`;
    msg += `⏳ Payment Pending\n`;
    msg += `\n📱 View receipt: ${receiptUrl}`;
    const encoded = encodeURIComponent(msg);
    const phone = customerPhone.trim().replace(/[\s\-\+]/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const sendSMSFromBilling = () => {
    if (!generatedBill) return;
    const itemLines = cart.map((i) => `${i.name} x${i.quantity}=Rs.${i.total.toFixed(0)}`).join(", ");
    const msg = `${generatedBill.billNumber} | ${itemLines} | Total: Rs.${generatedBill.total.toFixed(2)} | PENDING | ${receiptUrl}`;
    const phone = customerPhone.trim() || "";
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_self");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create New Bill</h2>
        <p className="text-muted-foreground">Search items, build cart, generate QR receipt.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Item Selection */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by item name or barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid gap-2 max-h-[50vh] overflow-y-auto sm:grid-cols-2">
                {loading ? (
                  <div className="col-span-2 flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-muted-foreground">
                    No items found. Add items in Inventory first.
                  </div>
                ) : (
                  items.map((item) => {
                    const inCart = cart.find((c) => c.itemId === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.category} &middot; {item.stock} in stock
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-semibold text-sm">₹{item.price}</span>
                          {inCart && (
                            <Badge variant="default" className="text-xs">{inCart.quantity}</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Cart & Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Input
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                placeholder="Phone number (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart size={18} />
                Cart ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Click items to add to cart
                </p>
              ) : (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.itemId} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.itemId, -1)}>
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.itemId, 1)}>
                          <Plus size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.itemId)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold w-16 text-right">₹{item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <Label className="text-muted-foreground shrink-0">Discount (₹)</Label>
                <Input
                  type="number"
                  className="h-8 w-24 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              {taxPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">₹{total.toFixed(2)}</span>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={handleGenerateBill}
                disabled={cart.length === 0 || generating}
              >
                {generating ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-5 w-5" />
                )}
                {generating ? "Generating..." : "Generate Bill & QR Code"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Bill Generated!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">{generatedBill?.billNumber}</p>
            <div className="rounded-xl border-4 border-primary/20 p-4 bg-white">
              <QRCodeSVG
                id="qr-code-svg"
                value={receiptUrl}
                size={200}
                level="H"
                fgColor="#0d9669"
              />
            </div>
            <p className="text-2xl font-bold text-primary">₹{generatedBill?.total?.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              Customer can scan this QR to view receipt & pay
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 break-all max-w-full">
              {receiptUrl}
            </p>

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer size={16} className="mr-2" />
                Print QR
              </Button>
            </div>

            <Button className="w-full" onClick={handleNewBill}>
              <RotateCcw size={16} className="mr-2" />
              New Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
