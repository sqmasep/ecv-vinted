// ===========================================================================
// Smoke test E2E — étape 5 (routes expertise).
//
// Pilote l'API RÉELLE (serveur lancé) avec de vraies sessions better-auth :
// se connecte en expert, retrouve l'article seedé au statut
// `sold_awaiting_shipment`, déroule reception -> start -> rapport -> decision,
// puis vérifie les cas d'erreur (401 / 403 / 422 / 409) et l'historique admin.
//
// Prérequis :
//   1. Base seedée :        bun db:seed        (depuis apps/api)
//   2. Serveur lancé :      bun dev            (depuis apps/api, port 3001)
//   3. Ce script :          bun run src/expertise-smoke.ts
//
// NB : un run consomme l'article (il finit en `authenticated`). Pour rejouer,
// relance `bun db:seed` afin de régénérer un article `sold_awaiting_shipment`.
// ===========================================================================

const BASE = process.env.API_URL ?? "http://localhost:3001";
const PASSWORD = "password123";

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  \x1b[32m✅\x1b[0m ${label}`);
  } else {
    fail++;
    console.log(`  \x1b[31m❌\x1b[0m ${label}`, detail ?? "");
  }
}

// Forward better-auth's Set-Cookie back as a Cookie header (name=value only).
function cookieFromRes(res: Response): string {
  const set = res.headers.getSetCookie?.() ?? [];
  return set.map((c) => c.split(";")[0]).join("; ");
}

type ApiResult = { status: number; data: any };

async function api(
  path: string,
  opts: { method?: string; cookie?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login ${email} échoué: ${res.status} ${await res.text()}`);
  }
  const cookie = cookieFromRes(res);
  if (!cookie) throw new Error(`pas de cookie de session pour ${email}`);
  return cookie;
}

async function main() {
  console.log(`\n🔎 Smoke test étape 5 sur ${BASE}\n`);

  // --- Connexions --------------------------------------------------------
  console.log("→ Connexions");
  const expert = await login("expert@ecrin.test");
  check("login expert", Boolean(expert));
  const admin = await login("admin@ecrin.test");
  check("login admin", Boolean(admin));
  const buyer = await login("alexandre@ecrin.test");
  check("login buyer", Boolean(buyer));

  const me = await api("/api/auth/get-session", { cookie: expert });
  const expertId: string | undefined = me.data?.user?.id;
  check("récupération de l'id expert via session", Boolean(expertId), me.data);

  // --- Article cible -----------------------------------------------------
  console.log("\n→ Recherche d'un article 'sold_awaiting_shipment'");
  const list = await api("/articles?state=sold_awaiting_shipment");
  const candidate = Array.isArray(list.data) ? list.data[0] : null;
  if (!candidate) {
    console.error(
      "\n❌ Aucun article au statut 'sold_awaiting_shipment'.\n" +
        "   Lance `bun db:seed` (depuis apps/api) puis relance ce script.\n",
    );
    process.exit(1);
  }
  const articleId: string = candidate.id;
  console.log(`  article cible: ${articleId} — ${candidate.brand} ${candidate.title}`);

  // --- Parcours nominal --------------------------------------------------
  console.log("\n→ Parcours nominal (expert)");

  const r1 = await api(`/expertise/${articleId}/reception`, {
    method: "POST",
    cookie: expert,
    body: { hubId: "hub-paris-01" },
  });
  check(`reception → received_at_hub [${r1.status}]`, r1.status === 200 && r1.data.newState === "received_at_hub", r1.data);
  const inspectionId: string | undefined = r1.data?.expertise?.id;
  check("id d'inspection retourné", Boolean(inspectionId));

  const r2 = await api(`/expertise/${inspectionId}/start`, {
    method: "POST",
    cookie: expert,
    body: { expertId },
  });
  check(`start → authentication_in_progress [${r2.status}]`, r2.status === 200 && r2.data.newState === "authentication_in_progress", r2.data);

  const r3 = await api(`/expertise/${inspectionId}/rapport`, {
    method: "POST",
    cookie: expert,
    body: { laboratoire: "Lab Paris", resultat: "conforme", urlDocument: "https://x.test/r.pdf" },
  });
  check(`rapport → lab_analysis [${r3.status}]`, r3.status === 200 && r3.data.newState === "lab_analysis", r3.data);

  const r4 = await api(`/expertise/${inspectionId}/decision`, {
    method: "POST",
    cookie: expert,
    body: { decision: "authenticated" },
  });
  check(`decision(authenticated) → authenticated [${r4.status}]`, r4.status === 200 && r4.data.newState === "authenticated", r4.data);

  // --- Cas d'erreur ------------------------------------------------------
  console.log("\n→ Cas d'erreur");

  const e401 = await api(`/expertise/${articleId}/reception`, {
    method: "POST",
    body: { hubId: "x" },
  });
  check(`401 sans session [${e401.status}]`, e401.status === 401);

  const e403 = await api(`/expertise/${articleId}/reception`, {
    method: "POST",
    cookie: buyer,
    body: { hubId: "x" },
  });
  check(`403 rôle buyer [${e403.status}]`, e403.status === 403);

  const e422 = await api(`/expertise/${articleId}/reception`, {
    method: "POST",
    cookie: expert,
    body: {},
  });
  check(`422 body invalide (hubId manquant) [${e422.status}]`, e422.status === 422);

  const e422motif = await api(`/expertise/${inspectionId}/decision`, {
    method: "POST",
    cookie: expert,
    body: { decision: "rejected" },
  });
  check(`422 refus sans motif (superRefine) [${e422motif.status}]`, e422motif.status === 422);

  const e409 = await api(`/expertise/${articleId}/reception`, {
    method: "POST",
    cookie: expert,
    body: { hubId: "hub-paris-01" },
  });
  check(`409 transition interdite (reception sur article authentifié) [${e409.status}]`, e409.status === 409, e409.data);

  // --- Historique --------------------------------------------------------
  console.log("\n→ Historique (audit)");

  const histExpert = await api(`/articles/${articleId}/historique`, { cookie: expert });
  check(`403 historique pour un expert [${histExpert.status}]`, histExpert.status === 403);

  const hist = await api(`/articles/${articleId}/historique`, { cookie: admin });
  const states = Array.isArray(hist.data) ? hist.data.map((e: any) => e.newState) : [];
  check(`200 historique admin [${hist.status}]`, hist.status === 200);
  // Le journal inclut l'événement initial du tunnel d'achat (sold_awaiting_shipment)
  // PUIS les 4 transitions pilotées par la brique d'expertise.
  check(
    "journal chronologique complet (achat + expertise)",
    states.join(",") ===
      "sold_awaiting_shipment,received_at_hub,authentication_in_progress,lab_analysis,authenticated",
    states,
  );

  // --- Bilan -------------------------------------------------------------
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Bilan : \x1b[32m${pass} OK\x1b[0m / \x1b[31m${fail} KO\x1b[0m`);
  console.log(`${"─".repeat(50)}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(
    "\n❌ Erreur. Le serveur est-il lancé ? (`bun dev` dans apps/api, port 3001)\n",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
