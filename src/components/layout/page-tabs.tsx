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
      "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl rounded-xl p-1",
      "border border-white/70 dark:border-white/[0.08]",
      "shadow-[0_1px_4px_rgba(100,120,160,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]",
      "dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]",
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
                "relative px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-all rounded-lg",
                active
                  ? "bg-white/80 dark:bg-white/[0.12] text-sky-600 dark:text-sky-400 border border-white/80 dark:border-white/[0.1] shadow-[0_1px_6px_rgba(100,120,160,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-white/[0.05]"
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
