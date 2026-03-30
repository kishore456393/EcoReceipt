"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, Receipt, Leaf } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const float = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-4 pt-24 pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Left: Copy */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
          >
            <Leaf className="h-4 w-4" />
            Go Green. Go Digital.
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Say Goodbye to{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Paper Receipts
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:mx-0"
          >
            Generate digital QR-code receipts for every sale. Let customers scan,
            view, pay via UPI, and download PDF bills -- all without a single sheet
            of paper. Built for Indian shopkeepers.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start"
          >
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 text-base")}>
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" data-icon="inline-end" />
            </Link>
            <a
              href="#how-it-works"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-8 text-base")}
            >
              See How It Works
            </a>
          </motion.div>

          <motion.p
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mt-4 text-sm text-muted-foreground"
          >
            Free forever for up to 100 bills/month. No credit card required.
          </motion.p>
        </div>

        {/* Right: Phone Mockup */}
        <motion.div
          className="relative flex flex-1 items-center justify-center"
          initial="initial"
          animate="animate"
          variants={float}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Glow behind phone */}
            <div className="absolute inset-0 rounded-[3rem] bg-primary/20 blur-2xl" />

            {/* Phone frame */}
            <div className="relative h-[520px] w-[260px] overflow-hidden rounded-[2.5rem] border-[3px] border-foreground/10 bg-card shadow-2xl sm:h-[560px] sm:w-[280px]">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-foreground/10" />

              {/* Screen content */}
              <div className="flex h-full flex-col items-center px-5 pt-10">
                {/* Status bar */}
                <div className="mb-4 flex w-full items-center justify-between text-xs text-muted-foreground">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="h-2 w-4 rounded-sm bg-primary/60" />
                    <div className="h-2 w-3 rounded-sm bg-primary/40" />
                    <div className="h-2 w-5 rounded-sm bg-primary/80" />
                  </div>
                </div>

                {/* App header */}
                <div className="mb-5 flex w-full items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                    <Leaf className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    Eco<span className="text-primary">Receipt</span>
                  </span>
                </div>

                {/* QR Code area */}
                <div className="mb-4 flex flex-col items-center rounded-2xl border border-border bg-background p-4">
                  <div className="grid h-28 w-28 grid-cols-5 grid-rows-5 gap-1 sm:h-32 sm:w-32">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm ${
                          [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 21, 22, 24].includes(i)
                            ? "bg-foreground"
                            : [3, 7, 8, 9, 11, 13, 15, 16, 17, 19, 23].includes(i)
                            ? "bg-primary/40"
                            : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    Scan to view receipt
                  </p>
                </div>

                {/* Mini receipt */}
                <div className="w-full rounded-xl border border-border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Sharma General Store
                    </span>
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { item: "Rice 5kg", price: "320" },
                      { item: "Toor Dal 1kg", price: "145" },
                      { item: "Mustard Oil 1L", price: "198" },
                    ].map((row) => (
                      <div
                        key={row.item}
                        className="flex justify-between text-[11px] text-muted-foreground"
                      >
                        <span>{row.item}</span>
                        <span>Rs.{row.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-dashed border-border pt-2">
                    <div className="flex justify-between text-xs font-bold text-foreground">
                      <span>Total</span>
                      <span>Rs.663</span>
                    </div>
                  </div>
                </div>

                {/* UPI button */}
                <div className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-center text-xs font-semibold text-primary-foreground">
                  Pay via UPI
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating badges */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="absolute -left-4 top-16 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:left-0"
          >
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-foreground">QR Generated!</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="absolute -right-2 bottom-24 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:right-2"
          >
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-500" />
              <span className="text-xs font-medium text-foreground">Paper Saved!</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
