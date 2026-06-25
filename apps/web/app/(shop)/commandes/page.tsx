import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { serverApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDateTime } from "@/lib/format";
import { STATE_LABELS, ESCROW_LABELS, isRejected } from "@/lib/states";

export const dynamic = "force-dynamic";

export default async function CommandesPage() {
  const api = await serverApi();
  const { data, error } = await api.orders.get();
  if (error) {
    if (error.status === 401) redirect("/sign-in");
    throw new Error("orders_unavailable");
  }
  const orders = data ?? [];

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-xl font-semibold">Mes commandes</h1>

      {orders.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">Aucune commande pour l’instant.</p>
          <Link href="/articles" className="mt-2 inline-block text-sm underline">
            Découvrir les pièces
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/suivi/${order.id}`}
                className="focus-visible:ring-ring/50 flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 outline-none hover:shadow-md focus-visible:ring-3"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-neutral-100 to-neutral-200 font-heading text-base font-semibold text-foreground/20 dark:from-neutral-800 dark:to-neutral-900">
                  {order.article.brand.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    {order.article.brand}
                  </p>
                  <p className="truncate text-sm font-medium">
                    {order.article.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(order.date)} · {formatPrice(order.amount)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant={
                      isRejected(order.article.currentState)
                        ? "destructive"
                        : order.status === "released"
                          ? "success"
                          : "secondary"
                    }
                  >
                    {STATE_LABELS[order.article.currentState]}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {ESCROW_LABELS[order.status]}
                  </span>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
