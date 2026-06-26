"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { rapportInputSchema, LAB_RESULTS } from "@repo/schemas";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { rapportAction } from "@/lib/expertise-actions";
import { useExpertiseAction } from "@/components/dossiers/use-expertise-action";
import { failedFields } from "@/lib/zod";

const RESULT_LABELS: Record<string, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  non_concluant: "Non concluant",
};

const FR_ERROR: Record<string, string> = {
  laboratoire: "Nom du laboratoire requis.",
  resultat: "Sélectionnez un résultat.",
  urlDocument: "URL de document valide requise (https://…).",
};

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function RapportForm({
  inspectionId,
  onClose,
}: {
  inspectionId: string;
  onClose: () => void;
}) {
  const { pending, run } = useExpertiseAction();
  const [failed, setFailed] = useState<Set<string>>(new Set());

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      laboratoire: String(fd.get("laboratoire") ?? "").trim(),
      resultat: String(fd.get("resultat") ?? ""),
      urlDocument: String(fd.get("urlDocument") ?? "").trim(),
    };
    const parsed = rapportInputSchema.safeParse(raw);
    if (!parsed.success) {
      setFailed(failedFields(parsed.error));
      return;
    }
    setFailed(new Set());
    run(
      () => rapportAction(inspectionId, parsed.data),
      "Rapport enregistré.",
      onClose,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Saisir un rapport labo"
      className="grid max-w-md gap-3 pt-1"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="laboratoire">Laboratoire</Label>
        <Input
          id="laboratoire"
          name="laboratoire"
          required
          aria-invalid={failed.has("laboratoire")}
          aria-describedby={failed.has("laboratoire") ? "laboratoire-error" : undefined}
        />
        {failed.has("laboratoire") ? (
          <p id="laboratoire-error" role="alert" className="text-sm text-destructive">
            {FR_ERROR.laboratoire}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="resultat">Résultat</Label>
        <select
          id="resultat"
          name="resultat"
          required
          defaultValue=""
          aria-invalid={failed.has("resultat")}
          aria-describedby={failed.has("resultat") ? "resultat-error" : undefined}
          className={SELECT_CLASS}
        >
          <option value="" disabled>
            Sélectionner…
          </option>
          {LAB_RESULTS.map((r) => (
            <option key={r} value={r}>
              {RESULT_LABELS[r]}
            </option>
          ))}
        </select>
        {failed.has("resultat") ? (
          <p id="resultat-error" role="alert" className="text-sm text-destructive">
            {FR_ERROR.resultat}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="urlDocument">URL du document</Label>
        <Input
          id="urlDocument"
          name="urlDocument"
          type="url"
          placeholder="https://…"
          required
          aria-invalid={failed.has("urlDocument")}
          aria-describedby={failed.has("urlDocument") ? "urlDocument-error" : undefined}
        />
        {failed.has("urlDocument") ? (
          <p id="urlDocument-error" role="alert" className="text-sm text-destructive">
            {FR_ERROR.urlDocument}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Enregistrer le rapport
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
