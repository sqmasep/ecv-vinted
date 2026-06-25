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
import { addItem, cartTotals, hasItem, removeItem } from "@/lib/cart";

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
    setItems((prev) => addItem(prev, item));
  }, []);

  const remove = useCallback((articleId: string) => {
    setItems((prev) => removeItem(prev, articleId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const { subtotal, fees, total, count } = cartTotals(items);
    return {
      items,
      add,
      remove,
      clear,
      has: (id) => hasItem(items, id),
      subtotal,
      fees,
      total,
      count,
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
