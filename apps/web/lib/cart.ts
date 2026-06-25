import type { CartItem } from "@repo/schemas";

export type CartTotals = {
  subtotal: number; // cents — sum of article prices
  fees: number; // cents — sum of authentication fees
  total: number; // cents — subtotal + fees
  count: number;
};

export function hasItem(items: CartItem[], articleId: string): boolean {
  return items.some((i) => i.articleId === articleId);
}

// Luxury pieces are unique — never add the same article twice.
export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  return hasItem(items, item.articleId) ? items : [...items, item];
}

export function removeItem(items: CartItem[], articleId: string): CartItem[] {
  return items.filter((i) => i.articleId !== articleId);
}

export function cartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const fees = items.reduce((s, i) => s + i.authenticationFee, 0);
  return { subtotal, fees, total: subtotal + fees, count: items.length };
}
