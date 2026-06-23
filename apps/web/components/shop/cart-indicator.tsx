"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "./cart-provider";

export function CartIndicator() {
  const { count, ready } = useCart();

  return (
    <Button asChild variant="ghost" size="sm" className="relative">
      <Link href="/panier" aria-label={`Panier, ${count} article(s)`}>
        <ShoppingBag className="size-4" />
        <span className="hidden sm:inline">Panier</span>
        {ready && count > 0 && (
          <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
}
