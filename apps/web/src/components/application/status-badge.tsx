import { Badge, type BadgeProps } from '@/components/ui/badge'
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '@/lib/constants'

const statusVariantMap: Readonly<
  Record<ApplicationStatus, BadgeProps['variant']>
> = {
  DRAFT: 'secondary',
  SUBMITTED: 'info',
  RETURNED: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
}

interface StatusBadgeProps {
  readonly status: ApplicationStatus
  readonly className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status]} className={className}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  )
}
