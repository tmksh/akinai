'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WishlistItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  slug: string;
  addedAt: string;
}

const WISHLIST_KEY = 'akinai_wishlist';

function loadWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWishlist(items: WishlistItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(loadWishlist());
    setMounted(true);
  }, []);

  const isInWishlist = useCallback((productId: string) => {
    return items.some(i => i.productId === productId);
  }, [items]);

  const addItem = useCallback((item: Omit<WishlistItem, 'addedAt'>) => {
    setItems(prev => {
      if (prev.some(i => i.productId === item.productId)) return prev;
      const next = [...prev, { ...item, addedAt: new Date().toISOString() }];
      saveWishlist(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.productId !== productId);
      saveWishlist(next);
      return next;
    });
  }, []);

  const toggle = useCallback((item: Omit<WishlistItem, 'addedAt'>) => {
    if (isInWishlist(item.productId)) {
      removeItem(item.productId);
      return false;
    } else {
      addItem(item);
      return true;
    }
  }, [isInWishlist, addItem, removeItem]);

  return {
    items,
    itemCount: items.length,
    mounted,
    isInWishlist,
    addItem,
    removeItem,
    toggle,
  };
}
