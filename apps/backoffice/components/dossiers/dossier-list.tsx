import type { ExpertiseListItem } from "@repo/schemas";

import { DossierRow } from "@/components/dossiers/dossier-row";

export type DossierListResult =
  | { status: "ok"; items: ExpertiseListItem[] }
  | { status: "empty"; filtered: boolean }
  | { status: "error"; message: string };

export function DossierList({ result }: { result: DossierListResult }) {
  if (result.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {result.message}
      </p>
    );
  }

  if (result.status === "empty") {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {result.filtered
            ? "Aucun dossier ne correspond à ces filtres."
            : "Aucun dossier en cours d'expertise."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {result.items.length} dossier{result.items.length > 1 ? "s" : ""}
      </p>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Dossiers d&apos;expertise, triés du plus ancien au plus récent dans
            leur état
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th scope="col" className="px-4 py-2 font-medium">
                Référence
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Marque
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                État
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Expert assigné
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Ancienneté
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <DossierRow key={item.articleId} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
