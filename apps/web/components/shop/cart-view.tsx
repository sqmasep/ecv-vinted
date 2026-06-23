"use client";

import Link from "next/link";
import { ShieldCheck, Trash2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { useCart } from "./cart-provider";

export function CartView() {
  const { items, remove, subtotal, fees, total, ready } = useCart();

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card p-10 text-center ring-1 ring-foreground/10">
        <p className="text-muted-foreground">Votre panier est vide.</p>
        <Button asChild className="mt-4">
          <Link href="/articles">Découvrir les pièces</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <ul className="grid gap-3">
        {items.map((item) => (
          <li
            key={item.articleId}
            className="flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
          >
            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-neutral-100 to-neutral-200 font-heading text-lg font-semibold text-foreground/20 dark:from-neutral-800 dark:to-neutral-900">
              {item.brand.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {item.brand}
              </p>
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-sm">{formatPrice(item.price)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Retirer du panier"
              onClick={() => remove(item.articleId)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <aside className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Récapitulatif</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Articles</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Frais d’authentification</dt>
            <dd>{formatPrice(fees)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Livraison</dt>
            <dd>Offerte</dd>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>

        <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          Paiement sécurisé, fonds protégés sous séquestre jusqu’à
          l’authentification.
        </p>

        <Button asChild size="lg" variant="vinted" className="mt-4 w-full">
          <Link href="/paiement">
            Procéder au paiement
            <ArrowRight />
          </Link>
        </Button>
      </aside>
    </div>
  );
}
