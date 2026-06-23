import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-heading font-semibold">ÉCRIN</span>
        <UserMenu />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4" />
          Seconde main de luxe authentifiée
        </span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          La pièce rare, garantie authentique
        </h1>
        <p className="text-muted-foreground max-w-md">
          Chaque pièce est authentifiée par nos experts. Paiement sous séquestre,
          suivi en temps réel de l’achat à la livraison.
        </p>
        <Button asChild size="lg" className="mt-2">
          <Link href="/articles">
            Découvrir la boutique
            <ArrowRight />
          </Link>
        </Button>
      </main>
    </div>
  );
}
