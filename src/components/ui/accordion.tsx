"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

interface AccordionContextValue {
  value: string | string[] | undefined
  onValueChange: (value: string) => void
  type: "single" | "multiple"
  collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined)

interface AccordionProps {
  type: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  collapsible?: boolean
  className?: string
  children: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type, value: controlledValue, defaultValue, onValueChange, collapsible = false, className, children }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | string[] | undefined>(
      defaultValue ?? (type === "multiple" ? [] : undefined)
    )
    
    const value = controlledValue ?? internalValue

    const handleValueChange = (itemValue: string) => {
      let newValue: string | string[] | undefined
      
      if (type === "single") {
        if (collapsible && value === itemValue) {
          newValue = undefined
        } else {
          newValue = itemValue
        }
      } else {
        const currentValue = (value as string[]) || []
        if (currentValue.includes(itemValue)) {
          newValue = currentValue.filter((v) => v !== itemValue)
        } else {
          newValue = [...currentValue, itemValue]
        }
      }
      
      setInternalValue(newValue)
      if (onValueChange) {
        onValueChange(newValue as string & string[])
      }
    }

    return (
      <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type, collapsible }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemContextValue {
  value: string
  isOpen: boolean
  toggle: () => void
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | undefined>(undefined)

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children }, ref) => {
    const accordionContext = React.useContext(AccordionContext)
    
    if (!accordionContext) {
      throw new Error("AccordionItem must be used within an Accordion")
    }

    const isOpen = accordionContext.type === "single"
      ? accordionContext.value === value
      : ((accordionContext.value as string[]) || []).includes(value)

    const toggle = () => {
      accordionContext.onValueChange(value)
    }

    return (
      <AccordionItemContext.Provider value={{ value, isOpen, toggle }}>
        <div ref={ref} className={cn("border-b", className)}>
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const itemContext = React.useContext(AccordionItemContext)
    
    if (!itemContext) {
      throw new Error("AccordionTrigger must be used within an AccordionItem")
    }

    return (
      <h3 className="flex">
        <button
          ref={ref}
          type="button"
          onClick={itemContext.toggle}
          className={cn(
            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
            className
          )}
          aria-expanded={itemContext.isOpen}
          {...props}
        >
          {children}
          <ChevronDown 
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              itemContext.isOpen && "rotate-180"
            )} 
          />
        </button>
      </h3>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
  className?: string
  children: React.ReactNode
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children }, ref) => {
    const itemContext = React.useContext(AccordionItemContext)
    
    if (!itemContext) {
      throw new Error("AccordionContent must be used within an AccordionItem")
    }

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden text-sm transition-all",
          itemContext.isOpen ? "animate-accordion-down" : "hidden"
        )}
      >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
