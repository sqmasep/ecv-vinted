"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

export function Filters({ brands }: { brands: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const key of ["q", "brand", "minPrice", "maxPrice"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) next.set(key, value);
    }
    router.push(next.toString() ? `/articles?${next}` : "/articles");
  }

  return (
    <details
      className="group rounded-xl bg-card ring-1 ring-foreground/10 open:pb-2 lg:open:pb-4"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          Filtres
        </span>
        <span className="text-muted-foreground text-xs group-open:hidden">
          Afficher
        </span>
      </summary>
      <form onSubmit={onSubmit} className="grid gap-4 px-4">
        <div className="grid gap-2">
          <Label htmlFor="f-q">Recherche</Label>
          <Input
            id="f-q"
            name="q"
            placeholder="Titre de la pièce"
            defaultValue={params.get("q") ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="f-brand">Marque</Label>
          <select
            id="f-brand"
            name="brand"
            defaultValue={params.get("brand") ?? ""}
            className="border-input focus-visible:ring-ring/50 h-8 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-3"
          >
            <option value="">Toutes les marques</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="f-min">Prix min (€)</Label>
            <Input
              id="f-min"
              name="minPrice"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={params.get("minPrice") ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="f-max">Prix max (€)</Label>
            <Input
              id="f-max"
              name="maxPrice"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={params.get("maxPrice") ?? ""}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Filtrer
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/articles")}
          >
            Réinitialiser
          </Button>
        </div>
      </form>
    </details>
  );
}
