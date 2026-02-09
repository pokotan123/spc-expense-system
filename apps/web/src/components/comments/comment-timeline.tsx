'use client'

import {
  MessageSquare,
  Send,
  CheckCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { ApplicationComment } from '@/lib/types'

const commentTypeConfig: Readonly<
  Record<
    ApplicationComment['commentType'],
    {
      readonly icon: React.ElementType
      readonly colorClass: string
      readonly label: string
    }
  >
> = {
  SUBMISSION: {
    icon: Send,
    colorClass: 'bg-blue-100 text-blue-600',
    label: '申請',
  },
  APPROVAL: {
    icon: CheckCircle,
    colorClass: 'bg-green-100 text-green-600',
    label: '承認',
  },
  RETURN: {
    icon: RotateCcw,
    colorClass: 'bg-yellow-100 text-yellow-600',
    label: '差戻し',
  },
  REJECTION: {
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-600',
    label: '却下',
  },
  GENERAL: {
    icon: MessageSquare,
    colorClass: 'bg-gray-100 text-gray-600',
    label: 'コメント',
  },
}

interface CommentTimelineProps {
  readonly comments: readonly ApplicationComment[]
}

export function CommentTimeline({ comments }: CommentTimelineProps) {
  if (comments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        コメントはありません
      </p>
    )
  }

  return (
    <div className="space-y-0" role="list" aria-label="コメント履歴">
      {comments.map((comment, index) => {
        const config = commentTypeConfig[comment.commentType]
        const Icon = config.icon
        const isLast = index === comments.length - 1

        return (
          <div key={comment.id} className="flex gap-3" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.colorClass}`}
                aria-label={config.label}
              >
                <Icon className="h-4 w-4" />
              </div>
              {!isLast ? (
                <div className="w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.memberName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              {comment.comment ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {comment.comment}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
