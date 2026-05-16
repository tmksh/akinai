'use client';

import { useState, useEffect, useCallback } from 'react';
import { addShopFavorite, removeShopFavorite } from '@/lib/actions/shop';

export interface WishlistItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  slug: string;
  addedAt: string;
}

const WISHLIST_KEY = 'akinai_wishlist';
const SESSION_ID_KEY = 'akinai_session_id';
const CUSTOMER_ID_KEY = 'akinai_customer_id';

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

/** ブラウザセッションIDを取得または生成する */
function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const newId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, newId);
    return newId;
  } catch {
    return '';
  }
}

/** ログイン中の顧客IDをlocalStorageから読む（ログイン後にセットされる） */
function getStoredCustomerId(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_ID_KEY);
  } catch {
    return null;
  }
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadWishlist());
    setSessionId(getOrCreateSessionId());
    setCustomerId(getStoredCustomerId());
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
    // DBに非同期で同期（UIをブロックしない）
    addShopFavorite(item.productId, { customerId, sessionId }).catch(() => {});
  }, [customerId, sessionId]);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.productId !== productId);
      saveWishlist(next);
      return next;
    });
    // DBに非同期で同期
    removeShopFavorite(productId, { customerId, sessionId }).catch(() => {});
  }, [customerId, sessionId]);

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
    customerId,
    isInWishlist,
    addItem,
    removeItem,
    toggle,
  };
}
