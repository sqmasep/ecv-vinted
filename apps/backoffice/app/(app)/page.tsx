import { Suspense } from "react";
import { EXPERTISE_STATES, type StatutExpertise } from "@repo/schemas";

import { serverApi } from "@/lib/api";
import { DossierFilters } from "@/components/dossiers/dossier-filters";
import {
  DossierList,
  type DossierListResult,
} from "@/components/dossiers/dossier-list";
import { DossierTableSkeleton } from "@/components/dossiers/dossier-table-skeleton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dossiers — ÉCRIN Back-office" };

type SearchParams = Promise<{ statut?: string; q?: string }>;

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const statut = EXPERTISE_STATES.includes(sp.statut as StatutExpertise)
    ? (sp.statut as StatutExpertise)
    : undefined;
  const q = sp.q?.trim() || undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">
          Dossiers d&apos;expertise
        </h1>
        <p className="text-sm text-muted-foreground">
          Pièces en cours d&apos;authentification — les plus anciennes dans leur
          état remontent en premier.
        </p>
      </div>

      <DossierFilters />

      <Suspense
        key={`${statut ?? "all"}-${q ?? ""}`}
        fallback={<DossierTableSkeleton />}
      >
        <DossierData statut={statut} q={q} />
      </Suspense>
    </div>
  );
}

async function DossierData({
  statut,
  q,
}: {
  statut?: StatutExpertise;
  q?: string;
}) {
  const api = await serverApi();
  const res = await api.expertise.get({
    query: {
      ...(statut ? { statut } : {}),
      ...(q ? { q } : {}),
    },
  });

  let result: DossierListResult;
  if (res.error || res.status !== 200 || !res.data) {
    result = {
      status: "error",
      message: `Impossible de charger les dossiers (code ${res.status}). Réessayez.`,
    };
  } else if (res.data.length === 0) {
    result = { status: "empty", filtered: Boolean(statut || q) };
  } else {
    result = { status: "ok", items: res.data };
  }

  return <DossierList result={result} />;
}
