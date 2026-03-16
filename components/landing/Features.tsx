"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  QrCode,
  Smartphone,
  Package,
  BarChart3,
  FileDown,
  Leaf,
} from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Code Receipts",
    description:
      "Generate a unique QR code for every bill instantly. Customers simply scan to view their digital receipt -- no paper needed.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Smartphone,
    title: "UPI Payments",
    description:
      "Customers can pay directly from the receipt via UPI deep links. Seamless checkout with Google Pay, PhonePe, Paytm, and more.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Package,
    title: "Smart Inventory",
    description:
      "Track your stock in real-time. Get low-stock alerts, manage products, and never run out of bestsellers again.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: BarChart3,
    title: "Sales Analytics",
    description:
      "Insights at your fingertips. See daily, weekly, and monthly sales trends, top products, and revenue breakdowns.",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: FileDown,
    title: "PDF Download",
    description:
      "Customers can download professional PDF receipts anytime. Perfect for returns, warranties, and expense tracking.",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Leaf,
    title: "Eco Friendly",
    description:
      "Save paper, save trees. Every digital receipt means one less thermal paper slip in a landfill. Go green effortlessly.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="features"
      className="relative bg-muted/30 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Features
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything Your Shop Needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From billing to inventory to payments -- EcoReceipt gives you a
            complete digital toolkit designed for Indian small businesses.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
