import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";

import { publicApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { AuthExplainer } from "@/components/shop/auth-explainer";
import { formatPrice } from "@/lib/format";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: article, error } = await publicApi.articles({ id }).get();
  if (error || !article) notFound();

  const total = article.price + article.authenticationFee;

  return (
    <div className="pb-20 lg:pb-0">
      <Link
        href="/articles"
        className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Boutique
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        {/* Gallery */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 ring-1 ring-foreground/10 dark:from-neutral-800 dark:to-neutral-900">
          <span className="font-heading text-7xl font-semibold tracking-tight text-foreground/15">
            {article.brand.slice(0, 2).toUpperCase()}
          </span>
          <Badge variant="gold" className="absolute left-4 top-4">
            <ShieldCheck />
            Authentification ÉCRIN
          </Badge>
        </div>

        {/* Buy column */}
        <div className="grid gap-6 lg:sticky lg:top-24">
          <div>
            <p className="text-muted-foreground text-sm uppercase tracking-wide">
              {article.brand}
            </p>
            <h1 className="font-heading mt-1 text-2xl font-semibold">
              {article.title}
            </h1>
            <p className="mt-3 text-2xl font-semibold">
              {formatPrice(article.price)}
            </p>
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Prix de la pièce</dt>
                <dd>{formatPrice(article.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Frais d’authentification ÉCRIN
                </dt>
                <dd>{formatPrice(article.authenticationFee)}</dd>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
          </div>

          <div className="hidden lg:block">
            <AddToCartButton article={article} />
          </div>

          <AuthExplainer />
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-1">
          <span className="font-semibold">{formatPrice(total)}</span>
          <div className="flex-1">
            <AddToCartButton article={article} />
          </div>
        </div>
      </div>
    </div>
  );
}
