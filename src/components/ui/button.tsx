import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(14,165,233,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(14,165,233,0.45)] active:shadow-none",
        destructive:
          "bg-destructive text-white shadow-[0_2px_8px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-white/80 dark:border-white/[0.12] text-foreground shadow-[0_1px_4px_rgba(100,120,160,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/80 dark:hover:bg-white/[0.1] hover:shadow-[0_2px_8px_rgba(100,120,160,0.15)]",
        secondary:
          "bg-white/50 dark:bg-white/[0.05] backdrop-blur-md border border-white/60 dark:border-white/[0.08] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/70 dark:hover:bg-white/[0.08]",
        ghost:
          "hover:bg-white/50 dark:hover:bg-white/[0.08] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
