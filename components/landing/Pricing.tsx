"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    description: "Perfect for getting started with digital receipts.",
    popular: false,
    features: [
      "Up to 100 bills/month",
      "50 inventory items",
      "QR code receipts",
      "UPI deep links",
      "PDF receipt download",
      "Basic dashboard",
    ],
    cta: "Start Free",
    href: "/login",
  },
  {
    name: "Pro",
    price: "499",
    period: "/mo",
    description: "For growing shops that need unlimited power.",
    popular: true,
    features: [
      "Unlimited bills",
      "Unlimited inventory items",
      "Razorpay payment integration",
      "Priority support",
      "Advanced sales analytics",
      "Multi-language receipts",
      "Custom receipt branding",
      "Export reports (CSV/Excel)",
    ],
    cta: "Start Pro Trial",
    href: "/login",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
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

export default function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="pricing"
      className="relative bg-muted/30 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      {/* Decorative blob */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free and upgrade when you grow. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-8 md:grid-cols-2"
        >
          {plans.map((plan) => (
            <motion.div key={plan.name} variants={cardVariants}>
              <Card
                className={`relative flex h-full flex-col overflow-visible ${
                  plan.popular
                    ? "border-2 border-primary shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                      Popular
                    </span>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        {plan.price === "0" ? "" : "\u20B9"}
                      </span>
                      <span className="text-4xl font-extrabold tracking-tight text-foreground">
                        {plan.price === "0" ? "Free" : plan.price}
                      </span>
                      {plan.price !== "0" && (
                        <span className="text-sm text-muted-foreground">
                          {plan.period}
                        </span>
                      )}
                    </div>
                    {plan.price === "0" && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Free {plan.period}
                      </p>
                    )}
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                            plan.popular ? "text-primary" : "text-emerald-500"
                          }`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Link
                    href={plan.href}
                    className={cn(
                      buttonVariants({
                        variant: plan.popular ? "default" : "outline",
                        size: "lg",
                      }),
                      "w-full"
                    )}
                  >
                    {plan.cta}
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          14-day free trial on Pro. Cancel anytime. No credit card required to
          start.
        </motion.p>
      </div>
    </section>
  );
}
