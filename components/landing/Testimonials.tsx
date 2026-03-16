"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    quote:
      "Before EcoReceipt, I used to spend Rs.500 every month on thermal paper rolls. Now my customers just scan the QR and get their bill on the phone. It is saving me money and my shop looks more modern!",
    name: "Rajesh Sharma",
    shop: "Sharma General Store",
    location: "Varanasi, Uttar Pradesh",
    initials: "RS",
    rating: 5,
  },
  {
    quote:
      "My customers love it! They used to lose paper receipts and come back confused about what they bought. Now everything is digital, they can check their bill anytime. The UPI payment link is also very convenient.",
    name: "Priya Deshpande",
    shop: "Priya Kirana & Provisions",
    location: "Satara, Maharashtra",
    initials: "PD",
    rating: 5,
  },
  {
    quote:
      "I run a small hardware shop and managing inventory was a headache. EcoReceipt tells me exactly what is in stock and what is selling fast. The billing is so quick now, my customers do not have to wait in line.",
    name: "Mohammed Ismail",
    shop: "Ismail Hardware & Paints",
    location: "Tiruchirappalli, Tamil Nadu",
    initials: "MI",
    rating: 5,
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
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
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
            Testimonials
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by Shopkeepers Across India
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Thousands of small business owners are already saving paper and
            delighting their customers.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              variants={cardVariants}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              {/* Stars */}
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.shop}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
