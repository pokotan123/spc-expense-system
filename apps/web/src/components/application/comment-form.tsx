'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CommentFormProps {
  readonly onSubmit: (comment: string) => Promise<void>
  readonly isPending: boolean
}

export function CommentForm({ onSubmit, isPending }: CommentFormProps) {
  const [comment, setComment] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = comment.trim()
    if (!trimmed) return

    await onSubmit(trimmed)
    setComment('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメントを入力..."
        rows={2}
        disabled={isPending}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !comment.trim()}
        >
          <Send className="mr-2 h-3 w-3" />
          {isPending ? '送信中...' : 'コメント追加'}
        </Button>
      </div>
    </form>
  )
}
