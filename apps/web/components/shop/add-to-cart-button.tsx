"use client";

import Link from "next/link";
import { ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import type { Article } from "@repo/schemas";

import { Button } from "@repo/ui/button";
import { useCart } from "./cart-provider";

export function AddToCartButton({ article }: { article: Article }) {
  const cart = useCart();
  const available = article.currentState === "listed";

  if (!available) {
    return (
      <Button size="lg" className="w-full" disabled>
        Vendue
      </Button>
    );
  }

  if (cart.has(article.id)) {
    return (
      <Button asChild size="lg" variant="outline" className="w-full">
        <Link href="/panier">
          <Check />
          Dans le panier — voir
        </Link>
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => {
        cart.add({
          articleId: article.id,
          title: article.title,
          brand: article.brand,
          price: article.price,
          authenticationFee: article.authenticationFee,
        });
        toast.success("Ajouté au panier");
      }}
    >
      <ShoppingBag />
      Ajouter au panier
    </Button>
  );
}
