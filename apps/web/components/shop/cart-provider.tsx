"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@repo/schemas";

const STORAGE_KEY = "ecrin-cart";

type CartContextValue = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (articleId: string) => void;
  clear: () => void;
  has: (articleId: string) => boolean;
  subtotal: number; // sum of article prices (cents)
  fees: number; // sum of authentication fees (cents)
  total: number; // subtotal + fees (cents)
  count: number;
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once (session persistence, no cart entity in DB).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // ignore corrupt storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) =>
      prev.some((i) => i.articleId === item.articleId) ? prev : [...prev, item],
    );
  }, []);

  const remove = useCallback((articleId: string) => {
    setItems((prev) => prev.filter((i) => i.articleId !== articleId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((s, i) => s + i.price, 0);
    const fees = items.reduce((s, i) => s + i.authenticationFee, 0);
    return {
      items,
      add,
      remove,
      clear,
      has: (id) => items.some((i) => i.articleId === id),
      subtotal,
      fees,
      total: subtotal + fees,
      count: items.length,
      ready,
    };
  }, [items, add, remove, clear, ready]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
