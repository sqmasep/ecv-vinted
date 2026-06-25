# API — ÉCRIN by Vinted

API métier **ElysiaJS** (runtime **Bun**). Deux domaines :

- **Tunnel d'achat** (catalogue / commandes) — exposé sur `/articles`, `/orders`.
- **Brique d'expertise** (authentification physique au hub) — exposé sur
  `/expertise/*` et `/articles/:id/historique`.

Client type-safe via **Eden Treaty** : le type `App` est exporté depuis
`src/index.ts` pour que le front et le back-office consomment l'API sans drift.

## Démarrage

```bash
bun db:seed     # users + articles de démo (idempotent)
bun dev         # serveur sur http://localhost:3001
```

Comptes seedés (mdp `password123`) : `sacha.debusschere@ecrin.fr` &
`romain.leblond@ecrin.fr` (admins), `lucas.phillipe@ecrin.fr` &
`camille.roussel@ecrin.fr` (experts), `alexandre.mercier@ecrin.fr` (buyer),
`elodie.fontaine@ecrin.fr` (seller).

## Tests

```bash
bun test            # vitest (unit) + bun:test (intégration)
bun test:unit       # machine à états (Vitest)
bun test:integration# service + routes (bun:sqlite en mémoire)
```

Smoke test E2E contre le serveur lancé :

```bash
bun run src/expertise-smoke.ts
```

---

## Brique d'expertise

### Règle d'or

La **machine à états** (`src/domain/expertise/state-machine.ts`) est la **seule
autorité** sur les changements de statut. Aucune écriture de statut hors de la
fonction `transition()`. Chaque transition réussie écrit, **dans la même
transaction SQL**, la mise à jour d'état **+** une ligne `status_event` (journal
d'audit). Toute combinaison non déclarée → erreur `TransitionInterdite` (409).

### Flux des états

```
[achat]                          [brique expertise]                       [achat]
listed ─paiement→ sold_awaiting_shipment
                          │ RECEPTION_HUB
                          ▼
                   received_at_hub
                          │ START_EXPERTISE (expert assigné)
                          ▼
            authentication_in_progress ──DEMANDE_LABO──► lab_analysis
                          │                                    │
                          │ VALIDER / REFUSER         VALIDER / REFUSER
                          ▼                                    ▼
              authenticated │ rejected          authenticated │ rejected
              (→ expédition) (remboursement)
```

| État courant | Événement | État cible | Garde | Effets |
|---|---|---|---|---|
| `sold_awaiting_shipment` | `RECEPTION_HUB` | `received_at_hub` | hub renseigné | notif acheteur « article reçu » |
| `received_at_hub` | `START_EXPERTISE` | `authentication_in_progress` | expert assigné | suivi MAJ (sans notif) |
| `authentication_in_progress` | `DEMANDE_LABO` | `lab_analysis` | — | suivi MAJ (sans notif) |
| `authentication_in_progress` \| `lab_analysis` | `VALIDER` | `authenticated` | décision positive | notif « authentifiée » + déblocage expédition |
| `authentication_in_progress` \| `lab_analysis` | `REFUSER` | `rejected` | motif fourni | remboursement + notifs acheteur & vendeur |

Les notifications sont abstraites derrière une interface `Notifier`
(`ConsoleNotifier` en POC, log structuré, pas d'envoi réel) et émises **après
commit** de la transaction.

### Routes

Toutes les routes d'action exigent une session **better-auth** de rôle `expert`
ou `admin`. L'historique est réservé à `admin`.

> `:id` désigne l'**article** pour `reception` (l'inspection n'existe pas encore)
> et l'**inspection** pour les autres routes (contrainte du routeur Elysia :
> même position de segment = même nom de paramètre).

| Endpoint | Méthode | Rôle | Body | Comportement |
|---|---|---|---|---|
| `/expertise/:id/reception` | POST | expert/admin | `{ hubId }` | ouvre l'inspection, `→ received_at_hub` |
| `/expertise/:id/start` | POST | expert/admin | `{ expertId }` | assigne l'expert, `→ authentication_in_progress` |
| `/expertise/:id/rapport` | POST | expert/admin | `{ laboratoire, resultat, urlDocument }` | crée un `lab_report`, `→ lab_analysis` |
| `/expertise/:id/decision` | POST | expert/admin | `{ decision, motif? }` | `→ authenticated` \| `rejected` (motif requis si refus) |
| `/articles/:id/historique` | GET | admin | — | journal `status_event` (lecture seule, chronologique) |

Réponse des routes d'action :

```jsonc
{
  "articleId": "…",
  "previousState": "received_at_hub",
  "newState": "authentication_in_progress",
  "idempotentReplay": false,
  "expertise": { /* ExpertiseDTO */ }
}
```

### Mapping des erreurs

| Cas | Code |
|---|---|
| Validation Zod (body) | `422` |
| Refus sans motif (`superRefine`) | `422` |
| Garde métier non satisfaite | `422` |
| Transition interdite | `409` |
| Pas de session | `401` |
| Rôle insuffisant | `403` |
| Article / inspection introuvable | `404` |

### Idempotence

Les déclencheurs externes (futurs webhooks labos) passent une `eventKey` unique :
un même événement rejoué ne réapplique pas la transition (déduplication sur
`status_event.event_key`).

## Architecture (brique)

```
src/domain/expertise/
  state-machine.ts        # transition() pure, table des transitions (cœur métier)
  state-machine.test.ts   # tests exhaustifs (Vitest)
  notifier.ts             # interface Notifier + ConsoleNotifier / RecordingNotifier
  expertise-service.ts    # orchestration + transaction atomique (état + journal)
  expertise-service.itest.ts
  routes.ts               # routes Elysia (factory testable : service + getUser + db)
  routes.itest.ts
```
