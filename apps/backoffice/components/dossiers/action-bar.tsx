"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExpertSummary } from "@repo/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allowedActions, type ActionKind } from "@/lib/transitions";
import {
  receptionAction,
  startAction,
  type ActionResult,
} from "@/lib/expertise-actions";

function variantFor(kind: ActionKind) {
  if (kind === "reject") return "destructive" as const;
  if (kind === "validate") return "default" as const;
  return "secondary" as const;
}

export function ActionBar({
  articleId,
  state,
  experts,
}: {
  articleId: string;
  state: string;
  experts: ExpertSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<ActionKind | null>(null);
  const actions = allowedActions(state);

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

  function handleResult(res: ActionResult, successMsg: string) {
    if (res.ok) {
      toast.success(successMsg);
      setOpen(null);
      router.refresh();
    } else {
      toast.error(res.message);
      // 409 = l'état a changé : on recharge pour réafficher les bonnes actions.
      if (res.status === 409) router.refresh();
    }
  }

  function onReception(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hubId = String(
      new FormData(e.currentTarget).get("hubId") ?? "",
    ).trim();
    if (!hubId) {
      toast.error("Identifiant de hub requis.");
      return;
    }
    startTransition(async () => {
      handleResult(await receptionAction(articleId, hubId), "Réception enregistrée.");
    });
  }

  function onStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const expertId = String(new FormData(e.currentTarget).get("expertId") ?? "");
    if (!expertId) {
      toast.error("Sélectionnez un expert.");
      return;
    }
    startTransition(async () => {
      handleResult(await startAction(articleId, expertId), "Expertise démarrée.");
    });
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

      {open === "rapport" || open === "validate" || open === "reject" ? (
        <p className="pt-1 text-sm text-muted-foreground">
          Saisie du rapport et décision : formulaire dédié à l&apos;étape
          suivante.
        </p>
      ) : null}
    </section>
  );
}
