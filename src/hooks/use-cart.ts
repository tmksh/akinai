'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  quantity: number;
  variant: Record<string, string>;
  sku: string;
}

const CART_KEY = 'akinai_cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setMounted(true);

    // 他タブでの変更を同期
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) {
        setItems(loadCart());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateItems = useCallback((newItems: CartItem[]) => {
    setItems(newItems);
    saveCart(newItems);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, 'id'> & { id?: string }) => {
    setItems(prev => {
      const existing = prev.findIndex(i => i.variantId === item.variantId);
      let next: CartItem[];
      if (existing >= 0) {
        next = prev.map((i, idx) =>
          idx === existing ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        const newItem: CartItem = {
          ...item,
          id: item.id || `${item.productId}-${item.variantId}`,
        };
        next = [...prev, newItem];
      }
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems(prev => {
      const next = quantity <= 0
        ? prev.filter(i => i.variantId !== variantId)
        : prev.map(i => i.variantId === variantId ? { ...i, quantity } : i);
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.variantId !== variantId);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    items,
    itemCount,
    subtotal,
    mounted,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    updateItems,
  };
}
