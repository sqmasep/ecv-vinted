import * as React from "react";
import { cn } from "./lib/utils";

// Verrou de co-marque « by Vinted » : un « by » en italique suivi du wordmark
// Vinted. La taille suit la police du contexte (unités em), donc le même
// composant s'adapte au header comme à la page de connexion. L'image vit dans
// le public/ de chaque app (vinted-wordmark.png), servie à la racine.
export function VintedByline({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="text-[0.62em] font-normal tracking-normal text-muted-foreground italic">
        by
      </span>
      <img
        src="/vinted-wordmark.png"
        alt="Vinted"
        className="h-[0.92em] w-auto"
      />
    </span>
  );
}
