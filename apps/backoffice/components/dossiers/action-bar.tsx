"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ExpertSummary } from "@repo/schemas";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { allowedActions, type ActionKind } from "@/lib/transitions";
import { receptionAction, startAction } from "@/lib/expertise-actions";
import { useExpertiseAction } from "@/components/dossiers/use-expertise-action";
import { RapportForm } from "@/components/dossiers/rapport-form";
import { DecisionPanel } from "@/components/dossiers/decision-panel";

function variantFor(kind: ActionKind) {
  if (kind === "reject") return "destructive" as const;
  // Validation de l'authentification = action de confiance → teal Vinted,
  // comme les CTA clés du parcours d'achat.
  if (kind === "validate") return "vinted" as const;
  return "secondary" as const;
}

export function ActionBar({
  articleId,
  inspectionId,
  state,
  experts,
}: {
  articleId: string;
  // null tant que l'inspection n'existe pas (avant la réception au hub).
  inspectionId: string | null;
  state: string;
  experts: ExpertSummary[];
}) {
  const { pending, run } = useExpertiseAction();
  const [open, setOpen] = useState<ActionKind | null>(null);
  const actions = allowedActions(state);
  const close = () => setOpen(null);

  if (actions.length === 0) {
    return (
      <section
        aria-labelledby="actions-title"
        className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <h2 id="actions-title" className="font-heading text-base font-medium">
          Actions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aucune action disponible : dossier clôturé ou hors périmètre
          d&apos;expertise.
        </p>
      </section>
    );
  }

  function onReception(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hubId = String(new FormData(e.currentTarget).get("hubId") ?? "").trim();
    if (!hubId) return;
    run(() => receptionAction(articleId, hubId), "Réception enregistrée.", close);
  }

  function onStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const expertId = String(new FormData(e.currentTarget).get("expertId") ?? "");
    if (!expertId || !inspectionId) return;
    run(() => startAction(inspectionId, expertId), "Expertise démarrée.", close);
  }

  return (
    <section
      aria-labelledby="actions-title"
      className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <h2 id="actions-title" className="font-heading text-base font-medium">
        Actions
      </h2>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.kind}
            variant={variantFor(a.kind)}
            aria-expanded={open === a.kind}
            onClick={() => setOpen(open === a.kind ? null : a.kind)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      {open === "reception" ? (
        <form onSubmit={onReception} className="grid max-w-sm gap-2 pt-1">
          <Label htmlFor="hubId">Identifiant du hub</Label>
          <Input id="hubId" name="hubId" placeholder="hub-paris-01" required />
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Confirmer la réception
          </Button>
        </form>
      ) : null}

      {open === "start" ? (
        <form onSubmit={onStart} className="grid max-w-sm gap-2 pt-1">
          <Label htmlFor="expertId">Expert à assigner</Label>
          {experts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun expert disponible.
            </p>
          ) : (
            <>
              <select
                id="expertId"
                name="expertId"
                required
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Sélectionner…
                </option>
                {experts.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={pending} className="w-fit">
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                Démarrer l&apos;expertise
              </Button>
            </>
          )}
        </form>
      ) : null}

      {open === "rapport" && inspectionId ? (
        <RapportForm inspectionId={inspectionId} onClose={close} />
      ) : null}

      {open === "validate" && inspectionId ? (
        <DecisionPanel
          inspectionId={inspectionId}
          decision="authenticated"
          onClose={close}
        />
      ) : null}

      {open === "reject" && inspectionId ? (
        <DecisionPanel
          inspectionId={inspectionId}
          decision="rejected"
          onClose={close}
        />
      ) : null}
    </section>
  );
}
