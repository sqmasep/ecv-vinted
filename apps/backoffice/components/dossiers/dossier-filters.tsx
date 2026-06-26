"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { EXPERTISE_STATES } from "@repo/schemas";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { stateMeta } from "@/lib/states";

// Filtres pilotés par l'URL (searchParams) → l'état est partageable/rechargeable
// et la page (server) re-fetch via Treaty. Le <select> filtre à la sélection ;
// la recherche se valide au submit (clavier-friendly).
export function DossierFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const statut = params.get("statut") ?? "";
  const q = params.get("q") ?? "";

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const query = sp.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    update({ q: value });
  }

  return (
    <form
      onSubmit={onSearch}
      role="search"
      aria-label="Filtrer les dossiers"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="grid gap-1.5 sm:w-52">
        <Label htmlFor="filter-statut">État</Label>
        <select
          id="filter-statut"
          value={statut}
          onChange={(e) => update({ statut: e.target.value })}
          // Bordure teal quand un filtre d'état est actif : cue de marque Vinted
          // partagé avec le parcours d'achat, indique l'état "actif" sans couleur seule.
          className={`h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${
            statut ? "border-vinted" : "border-input"
          }`}
        >
          <option value="">Tous les états</option>
          {EXPERTISE_STATES.map((s) => (
            <option key={s} value={s}>
              {stateMeta(s).label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5 sm:w-56">
        <Label htmlFor="filter-q">Recherche</Label>
        <Input
          key={q}
          id="filter-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Référence ou marque"
          className="w-full"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
        {statut || q ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(pathname)}
          >
            Réinitialiser
          </Button>
        ) : null}
      </div>
    </form>
  );
}
