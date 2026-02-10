import { Badge, type BadgeProps } from '@/components/ui/badge'
import {
  FileEdit,
  Clock,
  RotateCcw,
  CheckCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '@/lib/constants'

interface StatusConfig {
  readonly icon: LucideIcon
  readonly variant: BadgeProps['variant']
}

const STATUS_CONFIG: Readonly<Record<ApplicationStatus, StatusConfig>> = {
  DRAFT: { icon: FileEdit, variant: 'secondary' },
  SUBMITTED: { icon: Clock, variant: 'info' },
  RETURNED: { icon: RotateCcw, variant: 'warning' },
  APPROVED: { icon: CheckCircle, variant: 'success' },
  REJECTED: { icon: XCircle, variant: 'destructive' },
}

interface StatusBadgeProps {
  readonly status: ApplicationStatus
  readonly className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { icon: Icon, variant } = STATUS_CONFIG[status]

  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  )
}
