"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { decisionInputSchema } from "@repo/schemas";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { decisionAction } from "@/lib/expertise-actions";
import { useExpertiseAction } from "@/components/dossiers/use-expertise-action";
import {
  REJECT_PREVIEW,
  VALIDATE_PREVIEW,
} from "@/lib/notifications";

const TEXTAREA_CLASS =
  "min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function DecisionPanel({
  inspectionId,
  decision,
  onClose,
}: {
  inspectionId: string;
  decision: "authenticated" | "rejected";
  onClose: () => void;
}) {
  const { pending, run } = useExpertiseAction();
  const [motif, setMotif] = useState("");
  const [motifError, setMotifError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isReject = decision === "rejected";
  const preview = isReject ? REJECT_PREVIEW : VALIDATE_PREVIEW;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = {
      decision,
      motif: isReject ? motif.trim() : undefined,
    };
    // Même schéma que l'API : motif obligatoire si refus.
    const parsed = decisionInputSchema.safeParse(input);
    if (!parsed.success) {
      setMotifError(true);
      return;
    }
    setMotifError(false);
    setConfirming(true); // garde-fou : étape de confirmation explicite.
  }

  function confirm() {
    run(
      () =>
        decisionAction(inspectionId, {
          decision,
          motif: isReject ? motif.trim() : undefined,
        }),
      isReject ? "Pièce refusée." : "Pièce authentifiée.",
      onClose,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={isReject ? "Refuser la pièce" : "Valider la pièce"}
      className="grid max-w-md gap-3 pt-1"
    >
      {isReject ? (
        <div className="grid gap-1.5">
          <Label htmlFor="motif">Motif du refus</Label>
          <textarea
            id="motif"
            name="motif"
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            required
            aria-invalid={motifError}
            aria-describedby={motifError ? "motif-error" : undefined}
            className={TEXTAREA_CLASS}
          />
          {motifError ? (
            <p id="motif-error" role="alert" className="text-sm text-destructive">
              Le motif est obligatoire en cas de refus.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Aperçu des notifications
        </p>
        <ul className="space-y-1.5 text-sm">
          {preview.map((n) => (
            <li key={n.audience}>
              <span className="font-medium">{n.audience}&nbsp;: </span>
              <span className="text-muted-foreground">{n.message}</span>
            </li>
          ))}
        </ul>
      </div>

      {!confirming ? (
        <div className="flex gap-2">
          <Button
            type="submit"
            variant={isReject ? "destructive" : "default"}
            className="w-fit"
          >
            {isReject ? "Refuser…" : "Valider…"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
        </div>
      ) : (
        <div
          role="alert"
          className="grid gap-2 rounded-lg border border-border bg-background p-3"
        >
          <p className="flex items-start gap-1.5 text-sm font-medium">
            <AlertTriangle
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-amber-600"
            />
            Décision irréversible. Confirmer{" "}
            {isReject ? "le refus" : "la validation"} et l&apos;envoi des
            notifications&nbsp;?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isReject ? "destructive" : "default"}
              disabled={pending}
              onClick={confirm}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Confirmer définitivement
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
