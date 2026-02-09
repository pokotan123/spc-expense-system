import { MessageSquare, Send, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { ApplicationComment } from '@/lib/types'

const commentTypeConfig: Readonly<
  Record<
    ApplicationComment['commentType'],
    {
      readonly icon: React.ElementType
      readonly label: string
      readonly colorClass: string
    }
  >
> = {
  SUBMISSION: {
    icon: Send,
    label: '提出',
    colorClass: 'text-blue-600 bg-blue-50',
  },
  APPROVAL: {
    icon: CheckCircle,
    label: '承認',
    colorClass: 'text-green-600 bg-green-50',
  },
  RETURN: {
    icon: RotateCcw,
    label: '差戻し',
    colorClass: 'text-yellow-600 bg-yellow-50',
  },
  REJECTION: {
    icon: XCircle,
    label: '却下',
    colorClass: 'text-red-600 bg-red-50',
  },
  GENERAL: {
    icon: MessageSquare,
    label: 'コメント',
    colorClass: 'text-gray-600 bg-gray-50',
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
    <div className="space-y-4" role="list" aria-label="コメント履歴">
      {comments.map((comment) => {
        const config = commentTypeConfig[comment.commentType]
        const Icon = config.icon

        return (
          <div
            key={comment.id}
            className="flex gap-3"
            role="listitem"
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.colorClass}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.memberName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground">{comment.comment}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
