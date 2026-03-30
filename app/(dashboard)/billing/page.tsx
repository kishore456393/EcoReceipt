"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Loader2,
  ShoppingCart,
  Share2,
  Printer,
  RotateCcw,
  Volume2,
  VolumeX,
  Save,
  RefreshCw,
  Smartphone,
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
  barcode?: string | null;
}

interface BarcodeLookupResponse {
  found: boolean;
  source?: string;
  item?: {
    id: string;
    name: string;
    barcode: string | null;
    price: number;
    category: string;
    unit: string;
    stock: number;
  };
  product?: {
    barcode: string;
    name: string;
    brand?: string;
    category?: string;
    quantity?: string;
    indiaMatch?: boolean;
    source?: string;
  };
}

// Sound effects for scanner feedback
const playBeep = (success: boolean) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = success ? 800 : 300;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + (success ? 0.1 : 0.3));
  } catch {
    // Audio not supported
  }
};

export default function BillingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualCategory, setManualCategory] = useState("General");
  const [saveToInventory, setSaveToInventory] = useState(true);
  const [discount, setDiscount] = useState("0");
  const [taxPercent, setTaxPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [generatedBill, setGeneratedBill] = useState<{
    billNumber: string;
    qrToken: string;
    total: number;
  } | null>(null);
  // Network-accessible base URL (LAN IP in dev, real domain in prod)
  const [baseUrl, setBaseUrl] = useState("");
  // Mobile scanner session
  const [mobileScannerOpen, setMobileScannerOpen] = useState(false);
  const [mobileScannerSessionId, setMobileScannerSessionId] = useState("");
  const [mobileScannerConnected, setMobileScannerConnected] = useState(false);
  const mobileScannerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLockRef = useRef(false);

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
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          total: item.price,
          barcode: item.barcode,
        },
      ];
    });
  };

  const stopScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const lookupAndAddByBarcode = useCallback(
    async (rawBarcode: string) => {
      const barcode = rawBarcode.trim();
      if (!barcode) return;

      // Prevent duplicate scans of same barcode in quick succession
      if (barcode === lastScannedBarcode) {
        if (soundEnabled) playBeep(true);
        toast.info("Same barcode - quantity increased");
        // Find item in cart and increase quantity
        const cartItem = cart.find((c) => c.barcode === barcode);
        if (cartItem) {
          setCart((prev) =>
            prev.map((c) =>
              c.barcode === barcode
                ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
                : c
            )
          );
        }
        return;
      }

      setLookupLoading(true);
      setLastScannedBarcode(barcode);

      try {
        const existing = items.find((item) => item.barcode === barcode);
        if (existing) {
          addToCart(existing);
          if (soundEnabled) playBeep(true);
          toast.success(`${existing.name} added to cart`);
          return;
        }

        const res = await fetch(`/api/barcode/lookup/${encodeURIComponent(barcode)}`);
        if (!res.ok) {
          if (soundEnabled) playBeep(false);
          toast.error("Barcode not found. Add product manually.");
          setManualBarcode(barcode);
          return;
        }

        const data: BarcodeLookupResponse = await res.json();

        if (data.found && data.item) {
          addToCart(data.item);
          if (soundEnabled) playBeep(true);
          toast.success(`${data.item.name} added to cart`);
          return;
        }

        if (data.product) {
          setManualName(data.product.name || "");
          setManualBarcode(data.product.barcode || barcode);
          if (data.product.category) {
            setManualCategory(data.product.category.split(",")[0]?.trim() || "General");
          }
          if (soundEnabled) playBeep(true);
          toast.info(`Found: ${data.product.name}. Set price and add.`);
          return;
        }

        setManualBarcode(barcode);
        if (soundEnabled) playBeep(false);
        toast.error("Product not in inventory. Add it manually.");
      } catch {
        setManualBarcode(barcode);
        if (soundEnabled) playBeep(false);
        toast.error("Failed barcode lookup. Add product manually.");
      } finally {
        setLookupLoading(false);
      }
    },
    [items, soundEnabled, lastScannedBarcode, cart]
  );

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return;
    }

    let detector: { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let lastDetectedBarcode = "";
    let lastDetectedTime = 0;

    async function startScanner() {
      try {
        const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (init?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;

        if (!BarcodeDetectorCtor) {
          toast.error("Camera scanning is not supported on this browser.");
          setScannerOpen(false);
          return;
        }

        detector = new BarcodeDetectorCtor({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        intervalId = setInterval(async () => {
          if (!detector || !videoRef.current || scanLockRef.current) return;

          try {
            const results = await detector.detect(videoRef.current);
            if (!results.length) return;

            const value = results[0].rawValue?.trim();
            if (!value) return;

            const now = Date.now();
            // Prevent duplicate detection of same barcode within 2 seconds
            if (value === lastDetectedBarcode && now - lastDetectedTime < 2000) {
              return;
            }

            lastDetectedBarcode = value;
            lastDetectedTime = now;
            scanLockRef.current = true;

            setBarcodeInput(value);
            await lookupAndAddByBarcode(value);

            // In continuous mode, keep scanning; otherwise close
            if (!continuousMode) {
              setScannerOpen(false);
            }

            // Release lock after a short delay in continuous mode
            setTimeout(() => {
              scanLockRef.current = false;
            }, continuousMode ? 1500 : 0);
          } catch {
            // Ignore frame-level detector errors.
          }
        }, 300);
      } catch {
        toast.error("Unable to start camera scanner.");
        setScannerOpen(false);
      }
    }

    startScanner();

    return () => {
      if (intervalId) clearInterval(intervalId);
      stopScanner();
      scanLockRef.current = false;
    };
  }, [scannerOpen, stopScanner, lookupAndAddByBarcode, continuousMode]);

  // Mobile Scanner Functions
  const startMobileScanner = useCallback(async () => {
    try {
      const res = await fetch("/api/scanner-session?action=create");
      if (!res.ok) throw new Error("Failed to create session");
      const { sessionId } = await res.json();
      setMobileScannerSessionId(sessionId);
      setMobileScannerOpen(true);
      setMobileScannerConnected(false);

      // Start polling for barcodes
      mobileScannerPollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/scanner-session?sessionId=${sessionId}`);
          if (pollRes.ok) {
            const { barcodes } = await pollRes.json();
            if (barcodes && barcodes.length > 0) {
              setMobileScannerConnected(true);
              for (const { barcode } of barcodes) {
                if (barcode !== "__ping__") {
                  await lookupAndAddByBarcode(barcode);
                }
              }
            }
          }
        } catch {
          // Ignore poll errors
        }
      }, 1000);
    } catch {
      toast.error("Failed to start mobile scanner");
    }
  }, [lookupAndAddByBarcode]);

  const stopMobileScanner = useCallback(() => {
    if (mobileScannerPollRef.current) {
      clearInterval(mobileScannerPollRef.current);
      mobileScannerPollRef.current = null;
    }
    if (mobileScannerSessionId) {
      fetch(`/api/scanner-session?sessionId=${mobileScannerSessionId}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    setMobileScannerSessionId("");
    setMobileScannerOpen(false);
    setMobileScannerConnected(false);
  }, [mobileScannerSessionId]);

  // Cleanup mobile scanner on unmount
  useEffect(() => {
    return () => {
      if (mobileScannerPollRef.current) {
        clearInterval(mobileScannerPollRef.current);
      }
    };
  }, []);

  const addManualToCart = async () => {
    const name = manualName.trim();
    const barcode = manualBarcode.trim();
    const price = parseFloat(manualPrice);
    const quantity = parseInt(manualQty, 10) || 1;

    if (!name || Number.isNaN(price) || price <= 0) {
      toast.error("Enter valid product name and price");
      return;
    }

    // Save to inventory if checkbox is checked and has barcode
    if (saveToInventory && barcode) {
      setSavingItem(true);
      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            barcode,
            price,
            category: manualCategory || "General",
            unit: "piece",
            stock: 100, // Default stock
          }),
        });

        if (res.ok) {
          const newItem = await res.json();
          // Add to local items list
          setItems((prev) => [...prev, newItem]);
          // Add to cart using the new item
          setCart((prev) => {
            const existing = prev.find((c) => c.itemId === newItem.id);
            if (existing) {
              return prev.map((c) =>
                c.itemId === newItem.id
                  ? { ...c, quantity: c.quantity + quantity, total: (c.quantity + quantity) * c.price }
                  : c
              );
            }
            return [
              ...prev,
              {
                itemId: newItem.id,
                name: newItem.name,
                price: newItem.price,
                quantity,
                total: newItem.price * quantity,
                barcode: newItem.barcode,
              },
            ];
          });
          toast.success(`${name} saved to inventory & added to cart`);
          // Clear manual fields
          setManualName("");
          setManualBarcode("");
          setManualPrice("");
          setManualQty("1");
          setManualCategory("General");
          return;
        } else {
          // Item might already exist, continue to add manually
          const errorData = await res.json().catch(() => ({}));
          if (res.status === 409) {
            toast.info("Item already in inventory, adding to cart");
          } else {
            console.error("Failed to save to inventory:", errorData);
          }
        }
      } catch (err) {
        console.error("Error saving to inventory:", err);
      } finally {
        setSavingItem(false);
      }
    }

    // Fallback: add as manual item (not saved to inventory)
    const key = `manual-${(barcode || name).toLowerCase()}-${price.toFixed(2)}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.itemId === key);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map((item) =>
          item.itemId === key
            ? { ...item, quantity: newQty, total: newQty * item.price }
            : item
        );
      }

      return [
        ...prev,
        {
          itemId: key,
          name,
          price,
          quantity,
          total: price * quantity,
          barcode: barcode || null,
        },
      ];
    });

    toast.success(`${name} added to cart`);
    // Clear manual fields
    setManualName("");
    setManualBarcode("");
    setManualPrice("");
    setManualQty("1");
    setManualCategory("General");
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
            itemId: c.itemId.startsWith("manual-") ? undefined : c.itemId,
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
              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => setScannerOpen(true)}
                >
                  <Camera size={16} className="mr-2" />
                  Scan Barcode
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={startMobileScanner}
                >
                  <Smartphone size={16} className="mr-2" />
                  Phone Scanner
                </Button>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter barcode"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="default"
                    disabled={!barcodeInput.trim() || lookupLoading}
                    onClick={() => lookupAndAddByBarcode(barcodeInput)}
                  >
                    {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>

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

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Manual Quick Add</p>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="saveToInventory"
                      checked={saveToInventory}
                      onCheckedChange={(checked: boolean) => setSaveToInventory(checked)}
                      size="sm"
                    />
                    <Label htmlFor="saveToInventory" className="text-xs text-muted-foreground cursor-pointer">
                      Save to inventory
                    </Label>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Product name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                  <Input
                    placeholder="Barcode (optional)"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                  />
                  <Input
                    placeholder="Category"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                  />
                  <Button
                    type="button"
                    className="h-10"
                    onClick={addManualToCart}
                    disabled={savingItem}
                  >
                    {savingItem ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : saveToInventory ? (
                      <Save className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {savingItem ? "Saving..." : saveToInventory ? "Save & Add" : "Add"}
                  </Button>
                </div>
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

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center justify-between">
              <span>Scan Product Barcode</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border bg-black relative">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover"
                muted
                playsInline
              />
              {continuousMode && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-1 text-xs text-white">
                  <RefreshCw size={12} className="animate-spin" />
                  Continuous
                </div>
              )}
              {lastScannedBarcode && continuousMode && (
                <div className="absolute bottom-2 left-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white truncate">
                  Last: {lastScannedBarcode}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="continuousMode"
                  checked={continuousMode}
                  onCheckedChange={(checked: boolean) => setContinuousMode(checked)}
                  size="sm"
                />
                <Label htmlFor="continuousMode" className="text-sm cursor-pointer">
                  Continuous scanning (for multiple items)
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {continuousMode
                ? "Keep scanning products. Each barcode adds to cart automatically."
                : "Point camera at product barcode. Scanner closes after detection."}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScannerOpen(false)}
            >
              Close Scanner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Scanner Dialog */}
      <Dialog open={mobileScannerOpen} onOpenChange={(open) => {
        if (!open) stopMobileScanner();
      }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Smartphone size={20} />
              Use Phone as Scanner
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your phone to open the scanner
            </p>
            {mobileScannerSessionId && baseUrl && (
              <div className="rounded-xl border-4 border-primary/20 p-4 bg-white">
                <QRCodeSVG
                  value={`${baseUrl}/scanner/${mobileScannerSessionId}`}
                  size={180}
                  level="H"
                  fgColor="#0d9669"
                />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              {mobileScannerConnected ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-600 font-medium">Phone connected - scanning active</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Waiting for phone to connect...</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              Open the link on your phone. Scanned barcodes will automatically appear here in real-time.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={stopMobileScanner}
            >
              Stop Mobile Scanner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
