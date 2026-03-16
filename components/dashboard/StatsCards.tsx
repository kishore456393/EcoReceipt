"use client";

import { TrendingUp, TrendingDown, IndianRupee, FileText, Clock, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCard {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
}

export function StatsCards({ stats }: { stats: StatCard[] }) {
  const defaultStats: StatCard[] = stats.length
    ? stats
    : [
        { title: "Today's Revenue", value: "₹0", change: "+0%", trend: "neutral", icon: IndianRupee },
        { title: "Total Bills", value: "0", change: "+0", trend: "neutral", icon: FileText },
        { title: "Pending Payments", value: "0", icon: Clock },
        { title: "Items in Stock", value: "0", icon: Package },
      ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {defaultStats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon size={18} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <p
                className={cn(
                  "mt-1 flex items-center text-xs",
                  stat.trend === "up" && "text-emerald-600",
                  stat.trend === "down" && "text-red-600",
                  stat.trend === "neutral" && "text-muted-foreground"
                )}
              >
                {stat.trend === "up" && <TrendingUp size={14} className="mr-1" />}
                {stat.trend === "down" && <TrendingDown size={14} className="mr-1" />}
                {stat.change} from yesterday
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
