"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ClipboardList, QrCode, Smartphone } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Add Your Items",
    description:
      "Set up your shop inventory in minutes. Add products with names, prices, and stock quantities. Import in bulk or add one-by-one.",
    color: "bg-primary",
  },
  {
    number: "02",
    icon: QrCode,
    title: "Generate Bill & QR",
    description:
      "Scan items or search your catalog to build a bill. EcoReceipt instantly generates a unique QR code linked to the digital receipt.",
    color: "bg-emerald-600",
  },
  {
    number: "03",
    icon: Smartphone,
    title: "Customer Scans & Pays",
    description:
      "Your customer scans the QR code with any phone camera. They view the itemised bill and pay instantly via UPI -- no app download needed.",
    color: "bg-teal-600",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="how-it-works"
      className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
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
            How It Works
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three Simple Steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get started in minutes. No technical skills required -- if you can use
            a smartphone, you can use EcoReceipt.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative grid gap-8 lg:grid-cols-3 lg:gap-12"
        >
          {/* Connecting line (desktop) */}
          <div className="pointer-events-none absolute top-24 right-0 left-0 z-0 hidden lg:block">
            <div className="mx-auto h-0.5 max-w-3xl bg-gradient-to-r from-primary/40 via-emerald-500/40 to-teal-500/40" />
          </div>

          {/* Connecting line (mobile) */}
          <div className="pointer-events-none absolute inset-y-0 left-8 z-0 w-0.5 bg-gradient-to-b from-primary/30 via-emerald-500/30 to-teal-500/30 lg:hidden" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={stepVariants}
              className="relative z-10 flex flex-row items-start gap-5 lg:flex-col lg:items-center lg:text-center"
            >
              {/* Number + Icon */}
              <div className="relative flex-shrink-0">
                {/* Outer ring */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary/20 bg-card shadow-lg">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.color}`}
                  >
                    <step.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                {/* Step number badge */}
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 lg:mt-6">
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground lg:mx-auto">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector (desktop, between cards) */}
              {index < steps.length - 1 && (
                <div className="pointer-events-none absolute top-8 -right-6 hidden text-primary/40 lg:block">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-primary/40"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
