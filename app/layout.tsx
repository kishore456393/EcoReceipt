import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoReceipt - Paperless Digital Receipts",
  description:
    "Say goodbye to paper receipts. Generate digital receipts with QR codes, accept UPI payments, and manage your shop inventory — all in one place.",
  keywords: ["digital receipt", "paperless", "QR code", "UPI payment", "shop management", "eco-friendly"],
  openGraph: {
    title: "EcoReceipt - Paperless Digital Receipts",
    description: "Say goodbye to paper receipts. Digital billing for every shop.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
