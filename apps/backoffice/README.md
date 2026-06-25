# ÉCRIN — Back-office d'expertise

Outil opérateur interne pour piloter le cycle de vie physique des pièces de
luxe ÉCRIN : réception au hub → expertise → rapport(s) labo → décision
(authentification / refus). Next.js (App Router) + Eden Treaty + Better-auth +
Tailwind/Shadcn.

> Outil métier **sobre**, distinct de l'expérience acheteur. Le front ne décide
> jamais d'un statut : il propose les seules transitions légales depuis l'état
> courant et **l'API tranche** (la machine à états vit dans `apps/api`).

## Démarrage

```bash
# à la racine du monorepo
bun install

# 1. API métier (port 3001) — requise (auth + données)
cd apps/api && bun run dev

# 2. (première fois / pour réinitialiser le jeu de démo)
cd apps/api && bun run db:seed

# 3. Back-office (port 3002)
cd apps/backoffice && bun run dev
```

Back-office : http://localhost:3002

### Comptes de démo (mot de passe `password123`)

| Rôle     | E-mail                        | Accès                              |
| -------- | ----------------------------- | ---------------------------------- |
| Expert   | `lucas.phillipe@ecrin.fr`     | Liste, fiche, actions d'expertise  |
| Expert   | `camille.roussel@ecrin.fr`    | Liste, fiche, actions d'expertise  |
| Admin    | `sacha.debusschere@ecrin.fr`  | + journal d'audit des transitions  |
| Admin    | `romain.leblond@ecrin.fr`     | + journal d'audit des transitions  |
| Acheteur | `alexandre.mercier@ecrin.fr`  | Refusé (« Accès refusé »)          |

## Variables d'environnement

| Variable               | Défaut                  | Usage                                           |
| ---------------------- | ----------------------- | ----------------------------------------------- |
| `API_URL`              | `http://localhost:3001` | Base de l'API (client Treaty serveur + session) |
| `NEXT_PUBLIC_AUTH_URL` | `http://localhost:3001` | Base Better-auth côté navigateur (`@repo/auth`) |

Côté API, `CORS_ORIGINS` doit inclure l'origine du back-office
(`http://localhost:3002`, déjà par défaut).

## Rôles & contrôle d'accès

- Garde de session **serveur** (`app/(app)/layout.tsx` + `lib/session.ts`) :
  non connecté → redirection `/sign-in` ; rôle ≠ `expert`/`admin` → écran
  « Accès refusé ».
- La session/rôle est résolue via `GET /api/auth/get-session` (server-to-server :
  le runtime Node de Next ne peut pas charger `@repo/db`/`@repo/auth`, qui
  dépendent de `bun:sqlite`).
- L'**API reste la garde finale** : 401/403 gérés ; l'audit
  (`/articles/:id/historique`) est réservé `admin`.

## Écrans

1. **Connexion** (`/sign-in`) — accessible, réservée expert/admin.
2. **Liste des dossiers** (`/`) — table triée par ancienneté, filtres état +
   recherche, badges d'état lisibles sans la couleur, lignes cliquables.
3. **Fiche dossier** (`/dossiers/[id]`) — en-tête pièce + état courant, **actions
   contextuelles** (seules les transitions légales), rapports labo, **journal**
   (admin).
4. **Saisie rapport & décision** (dans la fiche) — formulaire labo validé via les
   schémas Zod partagés, décision valider/refuser (motif requis si refus), aperçu
   des notifications + confirmation (garde-fou), erreurs API accessibles
   (422/409/403).

## Qualité

```bash
bun run check-types   # tsc
bun run lint          # eslint --max-warnings 0
bun run test          # vitest (unitaires + rendu RTL + axe)
bun run build
```

- Accessibilité RGAA 4.1 / WCAG 2.1 AA : lien d'évitement, landmarks, focus
  visibles, labels associés, `aria-live`, audit **axe** automatisé.
- Type-safety de bout en bout : appels API via **Treaty** typé, schémas Zod de
  `@repo/schemas` réutilisés (jamais redéfinis).
