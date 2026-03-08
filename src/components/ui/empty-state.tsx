import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  heading: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, heading, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center", className)}>
      {Icon && <Icon className="mb-4 h-10 w-10 text-muted-foreground/50" />}
      <h3 className="mb-1 text-lg font-medium">{heading}</h3>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
