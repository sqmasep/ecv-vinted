"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Clock,
  ShieldCheck,
  FileText,
  XCircle,
} from "lucide-react";
import type { OrderWithArticle, State, StatusEvent } from "@repo/schemas";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatDateTime } from "@/lib/format";
import {
  JALONS,
  STATE_LABELS,
  SUB_STATE_LABELS,
  ESCROW_LABELS,
  jalonIndexForState,
  isRejected,
  isTerminal,
} from "@/lib/states";
import { cn } from "@/lib/utils";

type Payload = { order: OrderWithArticle; events: StatusEvent[] };

const POLL_MS = 4000;

export function TrackingTimeline({
  orderId,
  initial,
}: {
  orderId: string;
  initial: Payload;
}) {
  const [order, setOrder] = useState(initial.order);
  const [events, setEvents] = useState(initial.events);
  const [advancing, setAdvancing] = useState(false);

  const state = order.article.currentState as State;
  const terminal = isTerminal(state);
  const rejected = isRejected(state);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Payload;
    setOrder(data.order);
    setEvents(data.events);
  }, [orderId]);

  // Poll while the order is still in motion (read-only consumer of the machine).
  useEffect(() => {
    if (terminal) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [terminal, refresh]);

  async function advance(reject: boolean) {
    setAdvancing(true);
    try {
      await fetch(`/api/orders/${orderId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reject }),
      });
      await refresh();
    } finally {
      setAdvancing(false);
    }
  }

  // Timestamp of the event that produced each state.
  const eventTime: Partial<Record<State, number>> = {};
  for (const e of events) eventTime[e.newState] = e.occurredAt;

  // For the rejected branch, base progress on the last non-rejected event.
  const lastProgress =
    [...events].reverse().find((e) => e.newState !== "rejected")?.newState ??
    "sold_awaiting_shipment";
  const reachedIdx = rejected
    ? jalonIndexForState(lastProgress as State)
    : jalonIndexForState(state);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
      {/* Screen-reader live announcement of the current status. */}
      <div aria-live="polite" className="sr-only">
        Statut de la commande : {STATE_LABELS[state]}
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {order.article.brand}
            </p>
            <h1 className="font-heading text-lg font-semibold">
              {order.article.title}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatPrice(order.amount)}
            </p>
          </div>
          <Badge variant={order.status === "refunded" ? "destructive" : "success"}>
            <ShieldCheck />
            {ESCROW_LABELS[order.status]}
          </Badge>
        </header>

        <Separator className="my-5" />

        {rejected ? (
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <XCircle className="size-5" />
              Authenticité non confirmée
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Votre pièce n’a pas pu être authentifiée. Un remboursement
              automatique de {formatPrice(order.amount)} est en cours sur votre
              moyen de paiement.
            </p>
          </div>
        ) : null}

        <ol className="mt-2 grid gap-0">
          {JALONS.map((jalon, idx) => {
            const interrupted = rejected && idx > reachedIdx;
            const done = idx < reachedIdx || (idx === reachedIdx && terminal && !rejected);
            const active = !terminal && idx === reachedIdx;
            const time = eventTime[jalon.state];
            const showSub = active && state === "lab_analysis";

            return (
              <li key={jalon.state} className="flex gap-4">
                {/* Rail */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
                      done &&
                        "bg-amber-400 text-amber-950 ring-amber-400",
                      active &&
                        "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-200",
                      !done &&
                        !active &&
                        "bg-muted text-muted-foreground ring-foreground/10",
                    )}
                  >
                    {done ? (
                      <Check className="size-4" />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clock className="size-4" />
                    )}
                  </span>
                  {idx < JALONS.length - 1 && (
                    <span
                      className={cn(
                        "my-1 w-px flex-1",
                        idx < reachedIdx ? "bg-amber-400" : "bg-border",
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "pb-6",
                    interrupted && "opacity-40",
                  )}
                >
                  <p className="text-muted-foreground text-xs font-medium">
                    Jalon {jalon.numero}
                  </p>
                  <p className="text-sm font-medium">{jalon.titre}</p>
                  <p className="text-muted-foreground text-sm">
                    {jalon.description}
                  </p>
                  {showSub && (
                    <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {SUB_STATE_LABELS.lab_analysis}
                    </p>
                  )}
                  {time && (done || active) && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDateTime(time)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="grid gap-4">
        <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-emerald-600" />
            {ESCROW_LABELS[order.status]}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {order.status === "held"
              ? "Vos fonds restent protégés jusqu’à la validation de l’authenticité."
              : order.status === "released"
                ? "La transaction est finalisée."
                : "Le remboursement a été déclenché."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            disabled
            title="Disponible une fois le rapport publié"
          >
            <FileText className="size-4" />
            Voir le rapport
          </Button>
        </div>

        {/* Dev-only: simulate the back-office advancing the state machine. */}
        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-xl border border-dashed p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Démo — pilotage états
            </p>
            <div className="mt-3 grid gap-2">
              <Button
                size="sm"
                onClick={() => advance(false)}
                disabled={advancing || terminal}
              >
                {advancing && <Loader2 className="size-4 animate-spin" />}
                Étape suivante
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => advance(true)}
                disabled={advancing || terminal}
              >
                Simuler un refus
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
