import Link from "next/link";
import type { ExpertiseListItem } from "@repo/schemas";

import { StateBadge } from "@/components/dossiers/state-badge";
import { formatAge, formatDateTime, shortRef } from "@/lib/format";

// Ligne cliquable : un seul lien focusable par ligne, étiré sur toute la ligne
// (after:absolute inset-0) — clic souris ET navigation clavier, sans JS client.
export function DossierRow({ item }: { item: ExpertiseListItem }) {
  const ref = shortRef(item.articleId);
  return (
    <tr className="relative border-b border-border transition-colors last:border-0 hover:bg-vinted/[0.06] focus-within:bg-vinted/[0.06] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-vinted before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-within:before:opacity-100">
      <td className="px-4 py-3 align-top">
        <Link
          href={`/dossiers/${item.articleId}`}
          aria-label={`Ouvrir le dossier ${ref} — ${item.brand}, ${item.title}`}
          className="rounded-md font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {ref}
        </Link>
        <div className="text-muted-foreground">{item.title}</div>
      </td>
      <td className="px-4 py-3 align-top">{item.brand}</td>
      <td className="px-4 py-3 align-top">
        <StateBadge state={item.currentState} />
      </td>
      <td className="px-4 py-3 align-top">
        {item.inspectorName ?? (
          <span className="text-muted-foreground">Non assigné</span>
        )}
      </td>
      <td
        className="px-4 py-3 align-top whitespace-nowrap"
        title={formatDateTime(item.stateSince)}
      >
        {formatAge(item.stateSince)}
      </td>
    </tr>
  );
}
