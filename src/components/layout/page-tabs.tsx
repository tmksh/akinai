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
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname === tab.href || pathname.startsWith(tab.href + '/');
  };

  return (
    <div className={cn("", className)}>
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600 rounded-t-xl px-1.5 pt-1.5 flex items-end gap-0.5 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative px-5 py-2 text-sm font-medium whitespace-nowrap transition-all rounded-t-lg",
                active
                  ? "bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white"
                  : "text-white/80 hover:text-white hover:bg-white/15"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
