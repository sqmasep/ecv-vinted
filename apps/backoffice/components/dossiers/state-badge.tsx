import { Badge } from "@/components/ui/badge";
import { stateMeta } from "@/lib/states";

// Badge d'état lisible sans la couleur : icône (forme) + libellé (texte).
export function StateBadge({ state }: { state: string }) {
  const meta = stateMeta(state);
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}
