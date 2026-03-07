'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
  exact?: boolean;
}

interface PageTabsProps {
  tabs: Tab[];
  className?: string;
}

export function PageTabs({ tabs, className }: PageTabsProps) {
  const pathname = usePathname();

  const isActive = (tab: Tab) => {
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(tab.href + '/');
  };

  return (
    <div className={cn(
      "bg-white/40 dark:bg-[rgba(22,22,35,0.4)] backdrop-blur-lg rounded-xl border border-white/30 dark:border-white/[0.06] p-1",
      className
    )}>
      <nav className="flex gap-0.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-all rounded-lg",
                active
                  ? "bg-white/70 dark:bg-white/[0.08] text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/30 dark:hover:bg-white/5"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
