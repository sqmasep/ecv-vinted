"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { useCart } from "./cart-provider";

export function PaymentForm() {
  const router = useRouter();
  const { items, total, clear, ready } = useCart();
  const [loading, setLoading] = useState(false);

  // Empty cart → nothing to pay.
  useEffect(() => {
    if (ready && items.length === 0 && !loading) router.replace("/articles");
  }, [ready, items.length, loading, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const shipping = {
      fullName: String(form.get("fullName") ?? ""),
      address: String(form.get("address") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      city: String(form.get("city") ?? ""),
      country: String(form.get("country") ?? ""),
    };

    setLoading(true);
    try {
      // One order per piece (luxury items are unique). Card data never leaves
      // this form — the BFF mints a payment token.
      const orderIds: string[] = [];
      for (const item of items) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: item.articleId, shipping }),
        });
        if (res.status === 401) {
          toast.error("Connectez-vous pour finaliser votre achat.");
          router.push("/sign-in");
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Paiement refusé");
        }
        const order = (await res.json()) as { id: string };
        orderIds.push(order.id);
      }

      clear();
      toast.success("Paiement confirmé — fonds sous séquestre");
      router.push(`/suivi/${orderIds[0]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paiement refusé");
      setLoading(false);
    }
  }

  if (!ready || items.length === 0) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start"
    >
      <div className="grid gap-6">
        <fieldset className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <legend className="font-heading px-1 text-sm font-medium">
            Adresse de livraison
          </legend>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              name="address"
              autoComplete="street-address"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                name="postalCode"
                autoComplete="postal-code"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              name="country"
              autoComplete="country-name"
              defaultValue="France"
              required
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <legend className="font-heading flex items-center gap-2 px-1 text-sm font-medium">
            <Lock className="size-4" />
            Paiement
          </legend>
          <div className="grid gap-2">
            <Label htmlFor="card">Numéro de carte</Label>
            <Input
              id="card"
              name="card"
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              autoComplete="cc-number"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="exp">Expiration</Label>
              <Input id="exp" name="exp" placeholder="MM/AA" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" name="cvc" placeholder="123" required />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Démo — paiement simulé, aucune donnée bancaire n’est stockée.
          </p>
        </fieldset>
      </div>

      <aside className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Votre commande</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {items.map((item) => (
            <li key={item.articleId} className="flex justify-between gap-2">
              <span className="truncate text-muted-foreground">
                {item.brand} — {item.title}
              </span>
              <span>{formatPrice(item.price + item.authenticationFee)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-3" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>

        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="flex items-start gap-2 font-medium">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Vos fonds sont placés sous séquestre
          </p>
          <p className="mt-1">
            Ils ne seront versés au vendeur qu’après validation de
            l’authenticité. Remboursement automatique en cas de refus.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          variant="vinted"
          className="mt-4 w-full"
          disabled={loading}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Payer et lancer l’authentification
        </Button>
      </aside>
    </form>
  );
}
