"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-10 w-fit items-center justify-center rounded-xl p-1",
        "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl",
        "border border-white/70 dark:border-white/[0.08]",
        "shadow-[0_1px_4px_rgba(100,120,160,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]",
        "dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
        "text-muted-foreground hover:text-foreground",
        "data-[state=active]:bg-white/80 dark:data-[state=active]:bg-white/[0.12]",
        "data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400",
        "data-[state=active]:shadow-[0_1px_6px_rgba(100,120,160,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]",
        "dark:data-[state=active]:shadow-[0_1px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]",
        "data-[state=active]:border data-[state=active]:border-white/80 dark:data-[state=active]:border-white/[0.1]",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring/50 outline-none",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
