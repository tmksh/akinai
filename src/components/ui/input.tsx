import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 px-3 py-1 text-sm outline-none transition-all",
        "rounded-xl border",
        "bg-white/60 dark:bg-white/[0.07] backdrop-blur-md",
        "border-white/70 dark:border-white/[0.1]",
        "shadow-[0_1px_4px_rgba(100,120,160,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]",
        "dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]",
        "placeholder:text-muted-foreground/60",
        "focus-visible:border-orange-300 dark:focus-visible:border-orange-500/50",
        "focus-visible:ring-2 focus-visible:ring-orange-200/50 dark:focus-visible:ring-orange-500/20",
        "focus-visible:shadow-[0_1px_8px_rgba(249,115,22,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "selection:bg-primary selection:text-primary-foreground",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
