'use client'

import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  readonly icon?: React.ElementType
  readonly title: string
  readonly description?: string
  readonly action?: {
    readonly label: string
    readonly onClick: () => void
  }
  readonly children?: ReactNode
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="status"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? (
        <Button onClick={action.onClick}>{action.label}</Button>
      ) : null}
      {children}
    </div>
  )
}
