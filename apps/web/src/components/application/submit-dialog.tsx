'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface SubmitDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: (comment?: string) => void
  readonly isSubmitting: boolean
}

export function SubmitDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: SubmitDialogProps) {
  const [comment, setComment] = useState('')

  function handleConfirm() {
    onConfirm(comment || undefined)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setComment('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>申請を提出しますか？</DialogTitle>
          <DialogDescription>
            提出後は管理者による承認が必要になります。提出後の内容変更はできません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="submit-comment">コメント（任意）</Label>
          <Textarea
            id="submit-comment"
            placeholder="申請に関するコメントを入力"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? '提出中...' : '提出する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
