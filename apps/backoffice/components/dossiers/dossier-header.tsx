import type { Article } from "@repo/schemas";

import { StateBadge } from "@/components/dossiers/state-badge";
import { formatPrice, shortRef } from "@/lib/format";

export function DossierHeader({
  article,
  inspectorName,
}: {
  article: Article;
  inspectorName: string | null;
}) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs tracking-wide text-muted-foreground">
            {shortRef(article.id)}
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {article.title}
          </h1>
          <p className="text-muted-foreground">
            {article.brand} · {formatPrice(article.price)}
          </p>
          {inspectorName ? (
            <p className="text-sm">
              Expert assigné&nbsp;:{" "}
              <span className="font-medium">{inspectorName}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun expert assigné</p>
          )}
          <p className="text-xs text-muted-foreground">Photos non disponibles</p>
        </div>

        <div className="shrink-0 rounded-lg border border-border bg-background px-4 py-3 text-right">
          <p className="mb-1.5 text-xs tracking-wide text-muted-foreground uppercase">
            État courant
          </p>
          <StateBadge state={article.currentState} />
        </div>
      </div>
    </div>
  );
}
