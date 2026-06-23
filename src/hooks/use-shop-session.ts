'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = '_akinai_sid';

/**
 * ショップのセッションIDを管理するフック
 * localStorage に永続化し、セッションIDが存在しない場合は新規生成する
 * これにより同一ユーザーの閲覧とクリックを正確に紐付けられる
 */
export function useShopSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let sid = localStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sid);
      }
      setSessionId(sid);
    } catch {
      // localStorage が使えない環境（プライベートブラウジング等）では null のまま
    }
  }, []);

  return sessionId;
}
