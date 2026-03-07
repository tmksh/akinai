'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsNavigating(false);
    setProgress(0);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href === pathname) return;

      setIsNavigating(true);
      setProgress(20);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigating) return;

    const steps = [
      { delay: 100, value: 40 },
      { delay: 300, value: 60 },
      { delay: 600, value: 75 },
      { delay: 1200, value: 85 },
      { delay: 2500, value: 92 },
    ];

    const timers = steps.map(({ delay, value }) =>
      setTimeout(() => setProgress(value), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
