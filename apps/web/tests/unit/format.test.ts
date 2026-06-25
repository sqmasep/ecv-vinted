import { describe, expect, test } from "bun:test";
import { formatPrice, formatDateTime } from "../../lib/format";

// fr-FR uses narrow/no-break spaces for grouping and before the currency
// symbol — \s matches them too, so normalize to plain spaces for comparison.
const norm = (s: string) => s.replace(/\s/g, " ");

describe("formatPrice", () => {
  test("converts cents to euros without decimals", () => {
    expect(norm(formatPrice(0))).toBe("0 €");
    expect(norm(formatPrice(100))).toBe("1 €");
    expect(norm(formatPrice(145_000))).toBe("1 450 €");
    expect(norm(formatPrice(145_000_000))).toBe("1 450 000 €");
  });
});

describe("formatDateTime", () => {
  test("returns a fr-FR day/month + time string", () => {
    const out = formatDateTime(Date.UTC(2026, 5, 24, 8, 30));
    expect(typeof out).toBe("string");
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });
});
