import { Bell } from "lucide-react";
import type { EvenementStatutDTO } from "@repo/schemas";

import { StateBadge } from "@/components/dossiers/state-badge";
import { formatDateTime } from "@/lib/format";
import { stateMeta } from "@/lib/states";

const SOURCE_LABELS: Record<string, string> = {
  operateur: "Opérateur",
  webhook: "Webhook labo",
  systeme: "Système",
};

// Journal des transitions en lecture seule. Réservé admin (l'endpoint
// /articles/:id/historique exige le rôle admin) ; pour les autres rôles on
// affiche une note plutôt que d'appeler l'API (évite un 403).
export function HistoryPanel({
  events,
  isAdmin,
}: {
  events: EvenementStatutDTO[];
  isAdmin: boolean;
}) {
  return (
    <section
      aria-labelledby="history-title"
      className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <h2 id="history-title" className="mb-3 font-heading text-base font-medium">
        Journal des transitions
      </h2>

      {!isAdmin ? (
        <p className="text-sm text-muted-foreground">
          Réservé aux administrateurs.
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun évènement.</p>
      ) : (
        <ol className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className="border-l-2 border-border pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <StateBadge state={e.newState} />
                {e.previousState ? (
                  <span className="text-xs text-muted-foreground">
                    depuis {stateMeta(e.previousState).label}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <time dateTime={new Date(e.occurredAt).toISOString()}>
                  {formatDateTime(e.occurredAt)}
                </time>
                {" · "}
                {SOURCE_LABELS[e.source] ?? e.source}
                {e.actorId ? ` · acteur ${e.actorId.slice(0, 8)}` : ""}
              </p>
              {e.notificationSent && e.notificationMessage ? (
                <p className="mt-1 flex items-start gap-1.5 text-sm">
                  <Bell aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>{e.notificationMessage}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
