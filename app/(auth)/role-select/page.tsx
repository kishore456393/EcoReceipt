"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import { Store, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RoleSelectPage() {
  const [selected, setSelected] = useState<"SHOP_OWNER" | "CUSTOMER" | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { update } = useSession();

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });
      if (!res.ok) throw new Error("Failed to set role");
      await update();
      toast.success("Role set successfully!");
      router.push(selected === "SHOP_OWNER" ? "/dashboard" : "/customer");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: "SHOP_OWNER" as const,
      title: "Shop Owner",
      description: "Set up your shop, manage inventory, and generate digital receipts",
      icon: Store,
    },
    {
      id: "CUSTOMER" as const,
      title: "Customer",
      description: "View receipts, make payments, and download bills digitally",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 flex justify-center">
          <Logo size="large" />
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
            <CardDescription className="text-base">
              How will you be using EcoReceipt?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => (
              <motion.button
                key={role.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(role.id)}
                className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                  selected === role.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                    selected === role.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <role.icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">{role.title}</h3>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </motion.button>
            ))}

            <Button
              className="w-full h-12 text-base mt-4"
              disabled={!selected || loading}
              onClick={handleSubmit}
            >
              {loading ? "Setting up..." : "Continue"}
              {!loading && <ArrowRight size={18} className="ml-2" />}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
