"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface ChartData {
  date: string;
  revenue: number;
  count: number;
}

export function SalesChart({ data }: { data: ChartData[] }) {
  const maxRevenue = useMemo(
    () => Math.max(...data.map((d) => d.revenue), 1),
    [data]
  );

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No sales data yet. Create your first bill to see analytics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales This Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] items-end gap-2">
          {data.map((item) => {
            const height = (item.revenue / maxRevenue) * 100;
            const day = new Date(item.date).toLocaleDateString("en-IN", { weekday: "short" });
            return (
              <div key={item.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  ₹{item.revenue.toLocaleString("en-IN")}
                </span>
                <div className="w-full flex justify-center">
                  <div
                    className="w-full max-w-[40px] rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day}: ₹${item.revenue} (${item.count} bills)`}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{day}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
