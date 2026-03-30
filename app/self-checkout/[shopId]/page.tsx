"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Store,
  MapPin,
  Phone,
  User,
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Clock,
  Smartphone,
  ScanBarcode,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  PartyPopper,
  StopCircle,
} from "lucide-react";

// Sound feedback
const playBeep = (success: boolean) => {
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
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

interface ShopInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo: string | null;
  gstNumber: string | null;
  upiId: string | null;
  upiName: string | null;
  category: string | null;
  taxPercent: number;
}

interface ShopItem {
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

type Step = "welcome" | "scan" | "review" | "verification";

export default function SelfCheckoutPage() {
  const params = useParams();
  const shopId = params.shopId as string;

  // Data state
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState<Step>("welcome");

  // Welcome step
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Scan step
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef<unknown>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // Review step
  const [submitting, setSubmitting] = useState(false);

  // Verification step
  const [billId, setBillId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billTotal, setBillTotal] = useState(0);
  const [billQrToken, setBillQrToken] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch shop data
  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch(`/api/self-checkout/${shopId}`);
        if (!res.ok) {
          setError("Shop not found. Please check the QR code and try again.");
          return;
        }
        const data = await res.json();
        setShop(data.shop);
        setItems(data.items || []);
      } catch {
        setError("Failed to load shop. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    if (shopId) fetchShop();
  }, [shopId]);

  // Filtered items
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode?.includes(search)
  );

  // Cart management
  const addToCart = useCallback((item: ShopItem) => {
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
  }, []);

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

  // Barcode scanner
  const stopScanner = useCallback(async () => {
    try {
      const scanner = scannerRef.current as {
        stop?: () => Promise<void>;
        clear?: () => void;
      } | null;
      if (scanner) {
        if (scanner.stop) await scanner.stop();
        if (scanner.clear) scanner.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
    setScanning(false);
    setScannerError("");
  }, []);

  const lookupBarcode = useCallback(
    async (rawBarcode: string) => {
      const barcode = rawBarcode.trim();
      if (!barcode) return;

      // Duplicate check
      const now = Date.now();
      if (
        barcode === lastScannedRef.current &&
        now - lastScanTimeRef.current < 2000
      ) {
        // Same barcode — increase quantity
        const cartItem = cart.find((c) => c.barcode === barcode);
        if (cartItem) {
          setCart((prev) =>
            prev.map((c) =>
              c.barcode === barcode
                ? {
                    ...c,
                    quantity: c.quantity + 1,
                    total: (c.quantity + 1) * c.price,
                  }
                : c
            )
          );
          playBeep(true);
          toast.info("Same barcode — quantity increased");
        }
        setBarcodeInput("");
        return;
      }

      lastScannedRef.current = barcode;
      lastScanTimeRef.current = now;
      setLookupLoading(true);

      try {
        // Check client-side first
        const localItem = items.find((i) => i.barcode === barcode);
        if (localItem) {
          addToCart(localItem);
          playBeep(true);
          toast.success(`${localItem.name} added!`);
          setBarcodeInput("");
          setLookupLoading(false);
          return;
        }

        // API lookup
        const res = await fetch(
          `/api/self-checkout/barcode/${shopId}/${encodeURIComponent(barcode)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.item) {
            addToCart(data.item);
            playBeep(true);
            toast.success(`${data.item.name} added!`);
          } else if (data.product) {
            playBeep(true);
            toast.info(
              `Found: ${data.product.name}. This product isn't in the shop's inventory yet.`
            );
          } else {
            playBeep(false);
            toast.error("Barcode not found in this shop's inventory.");
          }
        } else {
          playBeep(false);
          toast.error("Barcode not found.");
        }
      } catch {
        playBeep(false);
        toast.error("Failed to look up barcode.");
      } finally {
        setLookupLoading(false);
        setBarcodeInput("");
      }
    },
    [items, cart, shopId, addToCart]
  );

  const startScanner = useCallback(async () => {
    setScannerError("");
    if (typeof window === "undefined") {
      setScannerError("Scanner not available");
      return;
    }

    try {
      const Html5QrcodeModule = await import("html5-qrcode");
      const Html5Qrcode = Html5QrcodeModule.Html5Qrcode;

      let devices;
      try {
        devices = await Html5Qrcode.getCameras();
      } catch {
        setScannerError(
          "Cannot access camera. Please allow camera permission."
        );
        return;
      }

      if (!devices || devices.length === 0) {
        setScannerError("No camera found.");
        return;
      }

      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
      );
      const cameraId = backCamera?.id || devices[0].id;

      const container = document.getElementById("self-checkout-scanner");
      if (!container) {
        setScannerError("Scanner container not found.");
        return;
      }
      container.classList.remove("hidden");
      container.style.minHeight = "280px";
      await new Promise((resolve) => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode("self-checkout-scanner", {
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
        (decodedText) => {
          lookupBarcode(decodedText);
        },
        () => {
          // No barcode in frame — ignore
        }
      );

      setScanning(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setScannerError(
          "Camera permission denied. Please allow camera access."
        );
      } else {
        setScannerError(`Camera error: ${msg}`);
      }
      setScanning(false);
    }
  }, [lookupBarcode]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Cart calculations
  const subtotal = cart.reduce((sum, c) => sum + c.total, 0);
  const taxPercent = shop?.taxPercent || 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount;

  // Submit bill
  const handleSubmitBill = async () => {
    if (cart.length === 0) {
      toast.error("Add items to cart first");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/self-checkout/${shopId}/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            itemId: c.itemId.startsWith("manual-") ? undefined : c.itemId,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
          })),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit bill");
      }

      const bill = await res.json();
      setBillId(bill.id);
      setBillNumber(bill.billNumber);
      setBillTotal(bill.total);
      setBillQrToken(bill.qrToken);
      setUpiId(bill.shop?.upiId || "");
      setUpiName(bill.shop?.upiName || bill.shop?.name || "");
      setStep("verification");
      toast.success("Bill submitted! Waiting for verification...");

      // Start polling for verification
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `/api/self-checkout/bill-status/${bill.id}`
          );
          if (pollRes.ok) {
            const statusData = await pollRes.json();
            if (statusData.verified) {
              setVerified(true);
              if (pollRef.current) clearInterval(pollRef.current);
              playBeep(true);
            }
          }
        } catch {
          // Ignore poll errors
        }
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit bill";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Cleanup polling
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // UPI payment URL
  const upiUrl =
    upiId && billTotal > 0
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
          upiName || shop?.name || "Shop"
        )}&am=${billTotal}&cu=INR&tn=Bill-${encodeURIComponent(billNumber)}`
      : null;

  // --- RENDER ---

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-accent/30 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading shop...</p>
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-gradient-to-b from-background to-accent/30">
        <Store size={48} className="text-muted-foreground" />
        <h1 className="text-xl font-bold">Shop Not Found</h1>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      {/* Progress Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-1">
            {(["welcome", "scan", "review", "verification"] as Step[]).map(
              (s, i) => {
                const stepNames = ["Details", "Scan", "Review", "Verify"];
                const stepIcons = [User, ScanBarcode, ShoppingBag, CheckCircle];
                const Icon = stepIcons[i];
                const isActive = s === step;
                const stepOrder = ["welcome", "scan", "review", "verification"];
                const isDone = stepOrder.indexOf(step) > stepOrder.indexOf(s);

                return (
                  <div
                    key={s}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "text-primary"
                        : isDone
                          ? "text-primary/60"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : isDone
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground/50"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle size={14} />
                      ) : (
                        <Icon size={14} />
                      )}
                    </div>
                    <span className="hidden sm:inline">{stepNames[i]}</span>
                    {i < 3 && (
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground/30 mx-1"
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* ============ STEP 1: WELCOME ============ */}
        {step === "welcome" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Shop header */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 shadow-sm">
                    <Store size={32} className="text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold">{shop.name}</h1>
                {shop.address && (
                  <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin size={14} /> {shop.address}
                  </p>
                )}
                {shop.phone && (
                  <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Phone size={14} /> {shop.phone}
                  </p>
                )}
              </div>
            </Card>

            {/* Self checkout intro */}
            <Card>
              <CardContent className="pt-6 text-center space-y-2">
                <ShoppingCart className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-lg font-semibold">Self-Checkout</h2>
                <p className="text-sm text-muted-foreground">
                  Scan products, build your cart, pay, and go!
                  <br />
                  Enter your details below to get started.
                </p>
              </CardContent>
            </Card>

            {/* Customer details form */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    Your Name *
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone size={16} className="text-primary" />
                    Phone Number (optional)
                  </label>
                  <Input
                    placeholder="Enter your phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-12 text-base"
                    inputMode="tel"
                  />
                </div>

                <Button
                  className="w-full h-14 text-base mt-2"
                  disabled={!customerName.trim()}
                  onClick={() => setStep("scan")}
                >
                  Start Shopping
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ============ STEP 2: SCAN & SHOP ============ */}
        {step === "scan" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Scanner Section */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Camera size={16} className="text-primary" />
                  Scan Product Barcode
                </h3>

                {/* Camera scanner */}
                <div
                  id="self-checkout-scanner"
                  className={`w-full rounded-lg bg-black overflow-hidden ${
                    scanning ? "" : "hidden"
                  }`}
                  style={{ minHeight: scanning ? "280px" : "0" }}
                />
                {scanning ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={stopScanner}
                  >
                    <StopCircle className="mr-2 h-4 w-4" /> Stop Camera
                  </Button>
                ) : (
                  <>
                    {scannerError && (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {scannerError}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full h-14"
                      onClick={startScanner}
                    >
                      <Camera className="mr-2 h-5 w-5" /> Open Camera Scanner
                    </Button>
                  </>
                )}

                {/* Manual barcode entry */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or type barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        barcodeInput.trim() &&
                        !lookupLoading
                      ) {
                        e.preventDefault();
                        lookupBarcode(barcodeInput);
                      }
                    }}
                    inputMode="numeric"
                    className="h-12"
                  />
                  <Button
                    disabled={!barcodeInput.trim() || lookupLoading}
                    onClick={() => lookupBarcode(barcodeInput)}
                    className="h-12 px-5"
                  >
                    {lookupLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus size={20} />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Product Search & Browse */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Search size={16} className="text-primary" />
                  Browse Products
                </h3>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                <div className="grid gap-2 max-h-[40vh] overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {search
                        ? "No products match your search"
                        : "No products available"}
                    </p>
                  ) : (
                    filteredItems.map((item) => {
                      const inCart = cart.find((c) => c.itemId === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            addToCart(item);
                            playBeep(true);
                            toast.success(`${item.name} added!`);
                          }}
                          className="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent active:scale-[0.98]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="font-semibold text-sm">
                              ₹{item.price}
                            </span>
                            {inCart && (
                              <Badge variant="default" className="text-xs">
                                {inCart.quantity}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Floating Cart Bar */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50">
                <div className="max-w-lg mx-auto">
                  <Button
                    className="w-full h-14 text-base"
                    onClick={() => {
                      stopScanner();
                      setStep("review");
                    }}
                  >
                    <ShoppingCart size={20} className="mr-2" />
                    Review Cart ({cart.length} item
                    {cart.length !== 1 ? "s" : ""}) — ₹{subtotal.toFixed(2)}
                    <ChevronRight size={20} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Back button */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep("welcome")}
            >
              <ChevronLeft size={16} className="mr-1" /> Back to Details
            </Button>

            {/* Bottom padding for floating cart */}
            {cart.length > 0 && <div className="h-20" />}
          </div>
        )}

        {/* ============ STEP 3: REVIEW & PAY ============ */}
        {step === "review" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                  <ShoppingBag size={18} className="text-primary" />
                  Your Cart
                </h3>

                {cart.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Your cart is empty
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between gap-2 rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ₹{item.price} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.itemId, -1)}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.itemId, 1)}
                          >
                            <Plus size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFromCart(item.itemId)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        <span className="text-sm font-semibold w-16 text-right">
                          ₹{item.total.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardContent className="pt-4 space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  <strong>{customerName}</strong>
                </p>
                {customerPhone && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {customerPhone}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {taxPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({taxPercent}%)
                    </span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                className="w-full h-14 text-base"
                disabled={cart.length === 0 || submitting}
                onClick={handleSubmitBill}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard size={20} className="mr-2" />
                )}
                {submitting
                  ? "Submitting..."
                  : `Submit Bill — ₹${total.toFixed(2)}`}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("scan")}
                >
                  <ChevronLeft size={16} className="mr-1" /> Add More Items
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============ STEP 4: VERIFICATION ============ */}
        {step === "verification" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {verified ? (
              /* ---- VERIFIED ---- */
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 px-6 py-10 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg animate-in zoom-in duration-500">
                      <CheckCircle size={40} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      Verified!
                    </h2>
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Your purchase has been approved
                    </p>
                  </div>
                  <PartyPopper
                    size={32}
                    className="text-emerald-500 mx-auto animate-bounce"
                  />
                </div>
                <CardContent className="pt-4 space-y-3 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Number</p>
                    <p className="font-bold text-lg">{billNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="font-bold text-2xl text-primary">
                      ₹{billTotal.toFixed(2)}
                    </p>
                  </div>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    Thank you for shopping at{" "}
                    <strong>{shop.name}</strong>! 🎉
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      window.open(
                        `/receipt/${billQrToken}`,
                        "_blank"
                      )
                    }
                  >
                    <Smartphone size={16} className="mr-2" />
                    View Digital Receipt
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* ---- WAITING FOR VERIFICATION ---- */
              <>
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 px-6 py-8 text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
                        <Clock
                          size={32}
                          className="text-amber-600 dark:text-amber-400 animate-pulse"
                        />
                      </div>
                    </div>
                    <h2 className="text-xl font-bold">
                      Waiting for Verification
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Show this screen to the shop owner. They will verify your
                      bill.
                    </p>
                  </div>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Bill Number
                        </p>
                        <p className="font-bold">{billNumber}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      >
                        <Clock size={12} className="mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Customer
                      </span>
                      <span className="font-medium text-sm">
                        {customerName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Items
                      </span>
                      <span className="font-medium text-sm">
                        {cart.length} item{cart.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        ₹{billTotal.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Option */}
                {upiUrl && (
                  <a
                    href={upiUrl}
                    className="flex items-center justify-center gap-3 w-full h-14 text-lg font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Smartphone size={22} />
                    Pay ₹{billTotal.toFixed(2)} via UPI
                  </a>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Checking for verification every few seconds...
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          Powered by EcoReceipt &middot; Digital receipts for a greener planet
        </p>
      </div>
    </div>
  );
}
