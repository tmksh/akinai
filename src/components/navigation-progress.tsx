'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

/**
 * リンククリック直後に画面上部に進捗バーを表示し、
 * 画面遷移中であることをユーザーに伝えるコンポーネント。
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 同一オリジンのリンククリックを検知して即座に進捗表示
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.download) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      setIsNavigating(true);
      setProgress(0);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // クリック後にバーを少しずつ進める（ indeterminately ）
  useEffect(() => {
    if (!isNavigating) return;
    setProgress(10);
    timerRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 120);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isNavigating]);

  // パスが変わったら完了アニメーションして非表示
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setProgress(100);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      completeRef.current = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
        prevPathname.current = pathname;
      }, 200);
    }
    return () => {
      if (completeRef.current) clearTimeout(completeRef.current);
    };
  }, [pathname]);

  // 遷移が長引いた場合のリセット（例: 15秒）
  useEffect(() => {
    if (!isNavigating) return;
    const t = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }, 15000);
    return () => clearTimeout(t);
  }, [isNavigating]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] h-0.5 w-full overflow-hidden bg-transparent pointer-events-none"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? 'width 0.2s ease-out' : 'width 0.12s ease-out',
        }}
      />
    </div>
  );
}
