import { describe, it, expect } from "vitest";

import { formatAge, formatPrice, shortRef } from "@/lib/format";

const BASE = 1_700_000_000_000;

describe("formatAge", () => {
  it("affiche les minutes sous une heure", () => {
    expect(formatAge(BASE - 5 * 60_000, BASE)).toBe("5 min");
  });
  it("affiche les heures sous un jour", () => {
    expect(formatAge(BASE - 3 * 3_600_000, BASE)).toBe("3 h");
  });
  it("affiche les jours au-delà", () => {
    expect(formatAge(BASE - 2 * 86_400_000, BASE)).toBe("2 j");
  });
  it("ne descend jamais sous zéro", () => {
    expect(formatAge(BASE + 10_000, BASE)).toBe("0 min");
  });
});

describe("shortRef", () => {
  it("prend les 8 premiers caractères en majuscules", () => {
    expect(shortRef("abcdef1234-uuid")).toBe("#ABCDEF12");
  });
});

describe("formatPrice", () => {
  it("formate des centimes en euros", () => {
    const out = formatPrice(1_000_000);
    expect(out).toContain("€");
    expect(out).toContain("10");
  });
});
