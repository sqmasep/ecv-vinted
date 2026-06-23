import type { ArticleFilters } from "@repo/schemas";

import { publicApi } from "@/lib/api";
import { ArticleCard } from "@/components/shop/article-card";
import { Filters } from "@/components/shop/filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  // Filters are euros in the URL (human-friendly); the API expects cents.
  const query: ArticleFilters = {};
  const q = str(sp.q);
  const brand = str(sp.brand);
  const minPrice = str(sp.minPrice);
  const maxPrice = str(sp.maxPrice);
  if (q) query.q = q;
  if (brand) query.brand = brand;
  if (minPrice) query.minPrice = Number(minPrice) * 100;
  if (maxPrice) query.maxPrice = Number(maxPrice) * 100;

  const [{ data: articles }, { data: all }] = await Promise.all([
    publicApi.articles.get({ query }),
    publicApi.articles.get({ query: {} }),
  ]);

  const brands = [...new Set((all ?? []).map((a) => a.brand))].sort();
  const list = articles ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:items-start">
      <aside className="lg:sticky lg:top-24">
        <Filters brands={brands} />
      </aside>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="font-heading text-xl font-semibold">Sélection</h1>
          <p className="text-muted-foreground text-sm">
            {list.length} pièce{list.length > 1 ? "s" : ""}
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center ring-1 ring-foreground/10">
            <p className="text-muted-foreground">
              Aucune pièce ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
