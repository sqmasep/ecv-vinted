import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { CartProvider } from "@/components/shop/cart-provider";
import { CartIndicator } from "@/components/shop/cart-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex min-h-svh flex-col">
        <div className="flex items-center justify-center gap-2 bg-vinted px-4 py-1.5 text-center text-xs text-vinted-foreground">
          <ShieldCheck className="size-3.5" />
          Toutes les pièces sont authentifiées par nos experts
        </div>
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-baseline gap-6">
              <Link href="/articles" className="font-heading text-lg font-semibold tracking-tight">
                ÉCRIN
              </Link>
              <nav className="hidden gap-4 text-sm sm:flex">
                <Link href="/articles" className="text-muted-foreground hover:text-foreground">
                  Boutique
                </Link>
                <Link href="/commandes" className="text-muted-foreground hover:text-foreground">
                  Mes commandes
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <CartIndicator />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </CartProvider>
  );
}
