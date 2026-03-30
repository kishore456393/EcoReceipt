import { Toaster } from "sonner";

export const metadata = {
  title: "Self-Checkout | EcoReceipt",
  description: "Scan products, build your cart, and pay — all from your phone.",
};

export default function SelfCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}
