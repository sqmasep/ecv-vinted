import { Skeleton } from "@repo/ui/skeleton";

// État de chargement de la liste (fallback Suspense).
export function DossierTableSkeleton() {
  return (
    <div
      className="space-y-2"
      role="status"
      aria-busy="true"
      aria-label="Chargement des dossiers"
    >
      <Skeleton className="h-4 w-24" />
      <div className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
