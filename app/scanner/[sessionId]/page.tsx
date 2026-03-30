"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import {
  Camera,
  Send,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
  Smartphone,
  Loader2,
  StopCircle,
} from "lucide-react";

// Sound effects
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

export default function MobileScannerPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [connected, setConnected] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualBarcode, setManualBarcode] = useState("");
  const [lastSent, setLastSent] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const scannerRef = useRef<unknown>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // Verify session on mount
  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch(`/api/scanner-session?sessionId=${sessionId}`, {
          method: "HEAD",
        });

        if (res.ok) {
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
    }

    if (sessionId) {
      verifySession();
    }
  }, [sessionId]);

  const sendBarcode = useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;

      // Prevent duplicate scans within 2 seconds
      const now = Date.now();
      if (barcode === lastScannedRef.current && now - lastScanTimeRef.current < 2000) {
        return;
      }
      lastScannedRef.current = barcode;
      lastScanTimeRef.current = now;

      setSending(true);
      try {
        const res = await fetch("/api/scanner-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, barcode: barcode.trim() }),
        });

        if (res.ok) {
          if (soundEnabled) playBeep(true);
          setLastSent(barcode);
          setScanCount((c) => c + 1);
          toast.success(`Sent: ${barcode}`);
        } else {
          if (soundEnabled) playBeep(false);
          toast.error("Failed to send barcode");
        }
      } catch {
        if (soundEnabled) playBeep(false);
        toast.error("Connection error");
      } finally {
        setSending(false);
      }
    },
    [sessionId, soundEnabled]
  );

  const stopScanner = useCallback(async () => {
    try {
      const scanner = scannerRef.current as { stop?: () => Promise<void>; clear?: () => void } | null;
      if (scanner) {
        if (scanner.stop) {
          await scanner.stop();
        }
        if (scanner.clear) {
          scanner.clear();
        }
        scannerRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    }
    setScanning(false);
    setScannerError("");
  }, []);

  const startScanner = useCallback(async () => {
    setScannerError("");

    // Check if we're in a browser
    if (typeof window === "undefined") {
      setScannerError("Scanner not available");
      return;
    }

    try {
      // Dynamically import html5-qrcode to avoid SSR issues
      const Html5QrcodeModule = await import("html5-qrcode");
      const Html5Qrcode = Html5QrcodeModule.Html5Qrcode;

      // Check if camera is available
      let devices;
      try {
        devices = await Html5Qrcode.getCameras();
      } catch (camErr) {
        console.error("Camera access error:", camErr);
        setScannerError("Cannot access camera. Please allow camera permission and reload the page.");
        return;
      }

      if (!devices || devices.length === 0) {
        setScannerError("No camera found on this device");
        return;
      }

      // Find back camera if available (prefer environment-facing camera on mobile)
      const backCamera = devices.find(
        (d) => d.label.toLowerCase().includes("back") || 
               d.label.toLowerCase().includes("rear") ||
               d.label.toLowerCase().includes("environment")
      );
      const cameraId = backCamera?.id || devices[0].id;

      // Wait for the container to be visible in the DOM
      const container = document.getElementById("scanner-container");
      if (!container) {
        setScannerError("Scanner container not found. Please try again.");
        return;
      }
      
      // Ensure container is visible before starting
      container.classList.remove("hidden");
      container.style.minHeight = "300px";
      
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode("scanner-container", { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          // Successfully scanned
          sendBarcode(decodedText);
        },
        () => {
          // Scan error (ignore - happens when no barcode in frame)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
        setScannerError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("not found")) {
        setScannerError("No camera found on this device.");
      } else if (errorMessage.includes("NotReadableError") || errorMessage.includes("in use")) {
        setScannerError("Camera is in use by another app. Please close other apps using the camera.");
      } else if (errorMessage.includes("OverconstrainedError")) {
        setScannerError("Camera settings not supported. Try reloading the page.");
      } else {
        setScannerError(`Camera error: ${errorMessage}`);
      }
      setScanning(false);
    }
  }, [sendBarcode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      sendBarcode(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  if (connected === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (connected === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Session Not Found</h1>
            <p className="text-muted-foreground text-sm">
              This scanner session has expired or is invalid. Please scan a new
              QR code from the billing page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Toaster position="top-center" richColors />

      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Mobile Scanner</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-4 w-4" />
              Connected
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Barcodes sent:</span>
              <span className="font-bold text-primary">{scanCount}</span>
            </div>
            {lastSent && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Last sent:</span>
                <span className="font-mono text-xs">{lastSent}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry - Primary option */}
        <Card className="border-primary">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Enter Barcode</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Type or scan barcode here"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="flex-1 text-lg h-12"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
              />
              <Button type="submit" disabled={!manualBarcode.trim() || sending} className="h-12 px-6">
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Use your phone&apos;s keyboard barcode scanning or type manually
            </p>
          </CardContent>
        </Card>

        {/* Camera Scanner */}
        <Card>
          <CardContent className="p-3 space-y-3">
            {/* Scanner container must always be in DOM for html5-qrcode to work */}
            <div 
              id="scanner-container" 
              className={`w-full rounded-lg bg-black ${scanning ? '' : 'hidden'}`}
              style={{ minHeight: scanning ? "300px" : "0" }} 
            />
            {scanning ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={stopScanner}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            ) : (
              <>
                {scannerError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-medium">{scannerError}</p>
                    {scannerError.includes("permission") && (
                      <p className="text-xs mt-2 text-muted-foreground">
                        Tip: Camera requires HTTPS. Use manual entry above, or access via localhost, or enable insecure origins in Chrome flags.
                      </p>
                    )}
                  </div>
                )}
                <Button variant="outline" className="w-full h-14" onClick={startScanner}>
                  <Camera className="mr-2 h-5 w-5" />
                  Try Camera Scanner
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <p className="text-xs text-center text-muted-foreground px-4">
          Point your camera at product barcodes. They will be automatically sent
          to the billing page. You can also type barcodes manually.
        </p>
      </div>
    </div>
  );
}
