import type { LabReportDTO } from "@repo/schemas";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

const RESULT_LABELS: Record<string, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  non_concluant: "Non concluant",
};

const RESULT_VARIANT: Record<
  string,
  "success" | "destructive" | "secondary"
> = {
  conforme: "success",
  non_conforme: "destructive",
  non_concluant: "secondary",
};

export function RapportsList({ rapports }: { rapports: LabReportDTO[] }) {
  return (
    <section
      aria-labelledby="rapports-title"
      className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <h2
        id="rapports-title"
        className="mb-3 font-heading text-base font-medium"
      >
        Rapports labo
      </h2>
      {rapports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun rapport enregistré.
        </p>
      ) : (
        <ul className="space-y-2">
          {rapports.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <Badge variant={RESULT_VARIANT[r.resultat] ?? "secondary"}>
                {RESULT_LABELS[r.resultat] ?? r.resultat}
              </Badge>
              <span className="font-medium">{r.laboratoire}</span>
              <span className="text-muted-foreground">
                · {formatDateTime(r.createdAt)}
              </span>
              {r.urlDocument ? (
                <a
                  href={r.urlDocument}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm text-foreground underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Voir le document
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
