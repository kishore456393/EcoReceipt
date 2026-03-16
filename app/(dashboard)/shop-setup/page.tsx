"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Store, Save, Loader2, MessageSquare } from "lucide-react";

interface ShopData {
  name: string;
  address: string;
  phone: string;
  gstNumber: string;
  upiId: string;
  upiName: string;
  category: string;
  taxPercent: number;
  razorpayKey: string;
  razorpaySecret: string;
  smsApiKey: string;
}

const defaultShop: ShopData = {
  name: "",
  address: "",
  phone: "",
  gstNumber: "",
  upiId: "",
  upiName: "",
  category: "general",
  taxPercent: 0,
  razorpayKey: "",
  razorpaySecret: "",
  smsApiKey: "",
};

const shopCategories = [
  "general", "grocery", "kirana", "medical", "electronics",
  "clothing", "bakery", "stationery", "hardware", "other",
];

const taxRates = [
  { label: "No Tax (0%)", value: "0" },
  { label: "GST 5%", value: "5" },
  { label: "GST 12%", value: "12" },
  { label: "GST 18%", value: "18" },
  { label: "GST 28%", value: "28" },
];

export default function ShopSetupPage() {
  const [shop, setShop] = useState<ShopData>(defaultShop);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch("/api/shop");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setShop({
              name: data.name || "",
              address: data.address || "",
              phone: data.phone || "",
              gstNumber: data.gstNumber || "",
              upiId: data.upiId || "",
              upiName: data.upiName || "",
              category: data.category || "general",
              taxPercent: data.taxPercent || 0,
              razorpayKey: data.razorpayKey || "",
              razorpaySecret: data.razorpaySecret || "",
              smsApiKey: data.smsApiKey || "",
            });
          }
        }
      } catch {
        toast.error("Failed to load shop data");
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, []);

  const handleSave = async () => {
    if (!shop.name.trim()) {
      toast.error("Shop name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shop),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Shop details saved successfully!");
    } catch {
      toast.error("Failed to save shop details");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ShopData, value: string | number) => {
    setShop((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Shop Setup</h2>
        <p className="text-muted-foreground">Configure your shop details and payment settings.</p>
      </div>

      {/* Shop Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store size={20} />
            Shop Information
          </CardTitle>
          <CardDescription>Basic details about your shop</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name *</Label>
              <Input
                id="name"
                placeholder="My Kirana Store"
                value={shop.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                value={shop.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Shop No. 5, Main Road, Village Name, District"
              value={shop.address}
              onChange={(e) => updateField("address", e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Shop Category</Label>
              <Select value={shop.category} onValueChange={(v) => updateField("category", v ?? "general")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shopCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST Number (optional)</Label>
              <Input
                id="gst"
                placeholder="22AAAAA0000A1Z5"
                value={shop.gstNumber}
                onChange={(e) => updateField("gstNumber", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax">Default Tax Rate</Label>
            <Select
              value={shop.taxPercent.toString()}
              onValueChange={(v) => updateField("taxPercent", parseFloat(v ?? "0"))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxRates.map((rate) => (
                  <SelectItem key={rate.value} value={rate.value}>
                    {rate.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* UPI Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">UPI Payment Settings</CardTitle>
          <CardDescription>
            Customers will see a &quot;Pay via UPI&quot; button on their receipt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                placeholder="yourshop@upi"
                value={shop.upiId}
                onChange={(e) => updateField("upiId", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upiName">UPI Display Name</Label>
              <Input
                id="upiName"
                placeholder="My Kirana Store"
                value={shop.upiName}
                onChange={(e) => updateField("upiName", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Razorpay Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Razorpay Settings (Pro)</CardTitle>
          <CardDescription>
            Accept payments via cards, netbanking, and UPI through Razorpay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rzpKey">Razorpay Key ID</Label>
              <Input
                id="rzpKey"
                placeholder="rzp_live_..."
                value={shop.razorpayKey}
                onChange={(e) => updateField("razorpayKey", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rzpSecret">Razorpay Key Secret</Label>
              <Input
                id="rzpSecret"
                type="password"
                placeholder="Enter secret"
                value={shop.razorpaySecret}
                onChange={(e) => updateField("razorpaySecret", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare size={18} />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Automatically send bill details via SMS when payment is completed.
            Get a free API key from{" "}
            <a
              href="https://www.fast2sms.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Fast2SMS.com
            </a>
            {" "}(free tier available).
            Without an API key, you can still send bills via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smsApiKey">Fast2SMS API Key</Label>
            <Input
              id="smsApiKey"
              type="password"
              placeholder="Paste your Fast2SMS API key here"
              value={shop.smsApiKey}
              onChange={(e) => updateField("smsApiKey", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
