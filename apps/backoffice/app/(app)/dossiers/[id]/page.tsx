import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { EvenementStatutDTO } from "@repo/schemas";

import { serverApi } from "@/lib/api";
import { getOperator } from "@/lib/session";
import { canAudit } from "@/lib/access";
import { DossierHeader } from "@/components/dossiers/dossier-header";
import { ActionBar } from "@/components/dossiers/action-bar";
import { RapportsList } from "@/components/dossiers/rapports-list";
import { HistoryPanel } from "@/components/dossiers/history-panel";

export const dynamic = "force-dynamic";

export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();

  const res = await api.expertise({ id }).get();
  if (res.status === 404) notFound();
  if (res.error || res.status !== 200 || !res.data) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        Impossible de charger le dossier (code {res.status}). Réessayez.
      </p>
    );
  }

  const detail = res.data;
  const operator = await getOperator();
  const isAdmin = canAudit(operator?.role);

  // Experts pour le sélecteur d'assignation (start). Cheap, toléré pour tous.
  const expertsRes = await api.experts.get();
  const experts =
    expertsRes.status === 200 && expertsRes.data ? expertsRes.data : [];

  // Journal réservé admin : on n'appelle l'endpoint que dans ce cas (sinon 403).
  let events: EvenementStatutDTO[] = [];
  if (isAdmin) {
    const hRes = await api.articles({ id }).historique.get();
    if (hRes.status === 200 && hRes.data) events = hRes.data;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour aux dossiers
      </Link>

      <DossierHeader
        article={detail.article}
        inspectorName={detail.inspectorName}
      />
      <ActionBar
        articleId={detail.article.id}
        state={detail.article.currentState}
        experts={experts}
      />
      <RapportsList rapports={detail.rapports} />
      <HistoryPanel events={events} isAdmin={isAdmin} />
    </div>
  );
}
