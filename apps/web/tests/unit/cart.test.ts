import { describe, expect, test } from "bun:test";
import type { CartItem } from "@repo/schemas";
import { addItem, cartTotals, hasItem, removeItem } from "../../lib/cart";

const a: CartItem = {
  articleId: "a",
  title: "Kelly 28",
  brand: "Hermès",
  price: 1_450_000,
  authenticationFee: 12_000,
};
const b: CartItem = {
  articleId: "b",
  title: "Classic Flap",
  brand: "Chanel",
  price: 720_000,
  authenticationFee: 9_000,
};

describe("cart", () => {
  test("addItem appends a new item", () => {
    expect(addItem([], a)).toEqual([a]);
  });

  test("addItem dedupes by articleId (unique pieces)", () => {
    const items = addItem([a], { ...a, title: "duplicate" });
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Kelly 28");
  });

  test("removeItem removes by id", () => {
    expect(removeItem([a, b], "a")).toEqual([b]);
  });

  test("removeItem is a no-op for unknown id", () => {
    expect(removeItem([a], "zzz")).toEqual([a]);
  });

  test("hasItem reports membership", () => {
    expect(hasItem([a], "a")).toBe(true);
    expect(hasItem([a], "b")).toBe(false);
  });

  test("cartTotals sums prices and fees", () => {
    expect(cartTotals([a, b])).toEqual({
      subtotal: 2_170_000,
      fees: 21_000,
      total: 2_191_000,
      count: 2,
    });
  });

  test("cartTotals of an empty cart is all zero", () => {
    expect(cartTotals([])).toEqual({
      subtotal: 0,
      fees: 0,
      total: 0,
      count: 0,
    });
  });
});
