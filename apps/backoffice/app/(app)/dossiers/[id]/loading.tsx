import { Skeleton } from "@/components/ui/skeleton";

// État de chargement de la fiche (loading.tsx du segment).
export default function Loading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Chargement du dossier"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
