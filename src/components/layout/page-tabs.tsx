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
    <div className={cn("border-b border-slate-200 dark:border-slate-700", className)}>
      <nav className="flex gap-1 overflow-x-auto scrollbar-thin -mb-px">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              isActive(tab)
                ? "border-orange-500 text-orange-600 dark:text-orange-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

