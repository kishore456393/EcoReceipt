"use client";

import { Leaf } from "lucide-react";
import Link from "next/link";

export function Logo({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizes = {
    small: { icon: 18, text: "text-lg" },
    default: { icon: 22, text: "text-xl" },
    large: { icon: 28, text: "text-2xl" },
  };

  const s = sizes[size];

  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf size={s.icon} />
      </div>
      <span className={`${s.text} text-foreground`}>
        Eco<span className="text-primary">Receipt</span>
      </span>
    </Link>
  );
}
