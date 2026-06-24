import { describe, it, expect } from "vitest";

import {
  resolveAccess,
  canAccessBackoffice,
  canAudit,
  canExpertise,
  type Operator,
} from "@/lib/access";

const op = (role: string): Operator => ({
  id: "u_1",
  name: "Test",
  email: "test@ecrin.test",
  role,
});

describe("resolveAccess", () => {
  it("redirige vers la connexion si non authentifié", () => {
    expect(resolveAccess(null)).toBe("sign-in");
  });
  it("autorise un expert", () => {
    expect(resolveAccess(op("expert"))).toBe("ok");
  });
  it("autorise un admin", () => {
    expect(resolveAccess(op("admin"))).toBe("ok");
  });
  it("refuse un acheteur", () => {
    expect(resolveAccess(op("buyer"))).toBe("forbidden");
  });
  it("refuse un vendeur", () => {
    expect(resolveAccess(op("seller"))).toBe("forbidden");
  });
});

describe("helpers de rôle", () => {
  it("canAccessBackoffice : expert/admin uniquement", () => {
    expect(canAccessBackoffice("expert")).toBe(true);
    expect(canAccessBackoffice("admin")).toBe(true);
    expect(canAccessBackoffice("buyer")).toBe(false);
    expect(canAccessBackoffice(undefined)).toBe(false);
    expect(canAccessBackoffice(null)).toBe(false);
  });

  it("canAudit : admin uniquement", () => {
    expect(canAudit("admin")).toBe(true);
    expect(canAudit("expert")).toBe(false);
    expect(canAudit("buyer")).toBe(false);
  });

  it("canExpertise : expert et admin", () => {
    expect(canExpertise("expert")).toBe(true);
    expect(canExpertise("admin")).toBe(true);
    expect(canExpertise("seller")).toBe(false);
  });
});
