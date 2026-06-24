import { publicApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Appel API à chaque requête (pas de pré-rendu statique : l'API tourne à part).
export const dynamic = "force-dynamic";

export default async function Home() {
  let online = false;
  let detail = "API injoignable";
  try {
    // Ping Treaty typé : lecture publique du catalogue.
    const res = await publicApi.articles.get({ query: {} });
    online = res.status === 200;
    detail = online
      ? `${res.data?.length ?? 0} article(s) au catalogue`
      : `Réponse ${res.status}`;
  } catch {
    online = false;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">
          Back-office d&apos;expertise
        </h1>
        <p className="text-sm text-muted-foreground">
          Pilotage du cycle de vie physique des pièces ÉCRIN.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Connexion à l&apos;API</CardTitle>
          <CardDescription>Vérification du client Treaty typé.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2">
            <Badge variant={online ? "success" : "destructive"}>
              {online ? "En ligne" : "Hors ligne"}
            </Badge>
            <span className="text-sm text-muted-foreground">{detail}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
