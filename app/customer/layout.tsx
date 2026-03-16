import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Logo size="small" />
          <div className="flex items-center gap-2">
            <Link
              href="/customer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              My Receipts
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
