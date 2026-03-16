"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndianRupee, FileText, Clock, Package, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";

interface Analytics {
  totalRevenue: number;
  totalBills: number;
  pendingCount: number;
  itemsInStock: number;
  revenueByDay: { date: string; revenue: number; count: number }[];
  topItems: { name: string; totalQuantity: number; totalRevenue: number }[];
  lowStockItems: { id: string; name: string; stock: number; lowStockThreshold: number }[];
  recentBills: {
    id: string;
    billNumber: string;
    total: number;
    status: string;
    customerName: string | null;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics?period=week");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (e) {
        console.error("Failed to fetch analytics:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const stats = analytics
    ? [
        {
          title: "Total Revenue",
          value: `₹${analytics.totalRevenue.toLocaleString("en-IN")}`,
          icon: IndianRupee,
          trend: "up" as const,
          change: `${analytics.totalBills} bills`,
        },
        {
          title: "Total Bills",
          value: analytics.totalBills.toString(),
          icon: FileText,
        },
        {
          title: "Pending Payments",
          value: analytics.pendingCount.toString(),
          icon: Clock,
        },
        {
          title: "Items in Stock",
          value: analytics.itemsInStock.toString(),
          icon: Package,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {session?.user?.name?.split(" ")[0] || "there"}!
          </h2>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your shop.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/billing" />}>
            <Plus size={18} className="mr-2" />
            New Bill
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <StatsCards stats={stats} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart data={analytics?.revenueByDay || []} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Bills</CardTitle>
            <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/bills" />}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {!analytics?.recentBills?.length ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No bills yet. Create your first bill to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.recentBills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{bill.billNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.customerName || "Walk-in customer"} &middot;{" "}
                        {new Date(bill.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={bill.status === "PAID" ? "default" : "secondary"}>
                        {bill.status}
                      </Badge>
                      <span className="font-semibold">₹{bill.total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics?.lowStockItems && analytics.lowStockItems.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-600">
              <AlertTriangle size={18} />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900 p-3"
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <Badge variant="secondary" className="text-amber-600">
                    {item.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
