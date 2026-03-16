"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Loader2, Store, Calendar, ChevronRight } from "lucide-react";

interface ReceiptSummary {
  id: string;
  billId: string;
  viewedAt: string;
  downloadedAt: string | null;
  bill: {
    id: string;
    billNumber: string;
    total: number;
    status: string;
    qrToken: string;
    createdAt: string;
    shop: {
      name: string;
    };
  };
}

export default function CustomerDashboard() {
  const { data: session } = useSession();
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchReceipts() {
      try {
        const res = await fetch("/api/customer/receipts");
        if (res.ok) {
          const data = await res.json();
          setReceipts(data);
        }
      } catch {
        console.error("Failed to load receipts");
      } finally {
        setLoading(false);
      }
    }
    fetchReceipts();
  }, []);

  const filtered = receipts.filter(
    (r) =>
      r.bill.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.bill.shop.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Hello, {session?.user?.name?.split(" ")[0] || "there"}!
        </h1>
        <p className="text-muted-foreground">Your digital receipts, all in one place.</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by shop name or bill number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
          <FileText size={40} />
          <p className="text-center">
            {receipts.length === 0
              ? "No receipts yet. Scan a shop QR code to see your first receipt here."
              : "No receipts match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((receipt) => (
            <Link key={receipt.id} href={`/receipt/${receipt.bill.qrToken}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer mb-3">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Store size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{receipt.bill.shop.name}</p>
                      <Badge
                        variant={receipt.bill.status === "PAID" ? "default" : "secondary"}
                        className={
                          receipt.bill.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                            : ""
                        }
                      >
                        {receipt.bill.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      <span>{receipt.bill.billNumber}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(receipt.bill.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-bold">
                      ₹{receipt.bill.total.toLocaleString("en-IN")}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
