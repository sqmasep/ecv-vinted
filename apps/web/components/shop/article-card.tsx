import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Article } from "@repo/schemas";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ArticleCard({ article }: { article: Article }) {
  const available = article.currentState === "listed";

  return (
    <Link
      href={`/articles/${article.id}`}
      className="group focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow group-hover:shadow-lg">
        <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
          <span className="font-heading text-5xl font-semibold tracking-tight text-foreground/15">
            {article.brand.slice(0, 2).toUpperCase()}
          </span>
          <Badge variant="gold" className="absolute left-3 top-3">
            <ShieldCheck />
            Authentification ÉCRIN
          </Badge>
          {!available && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Badge variant="secondary">Vendue</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            {article.brand}
          </p>
          <h3 className="line-clamp-2 text-sm font-medium">{article.title}</h3>
          <p
            className={cn(
              "mt-auto pt-2 text-base font-semibold",
              !available && "text-muted-foreground",
            )}
          >
            {formatPrice(article.price)}
          </p>
        </div>
      </article>
    </Link>
  );
}
