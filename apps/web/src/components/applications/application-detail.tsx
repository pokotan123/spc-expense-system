'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/applications/status-badge'
import { SubmitDialog } from '@/components/applications/submit-dialog'
import { ReceiptGallery } from '@/components/receipts/receipt-gallery'
import { OcrResultEditor } from '@/components/receipts/ocr-result-editor'
import { CommentTimeline } from '@/components/comments/comment-timeline'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Pencil, Trash2, Send, ArrowLeft } from 'lucide-react'
import type { ExpenseApplication } from '@/lib/types'

interface ApplicationDetailProps {
  readonly application: ExpenseApplication
  readonly onSubmit: () => Promise<void>
  readonly onDelete: () => Promise<void>
  readonly isSubmitting: boolean
  readonly isDeleting: boolean
}

export function ApplicationDetail({
  application,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting,
}: ApplicationDetailProps) {
  const router = useRouter()
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canEdit =
    application.status === 'DRAFT' || application.status === 'RETURNED'
  const canDelete = application.status === 'DRAFT'
  const canSubmit = application.status === 'DRAFT'

  async function handleDelete() {
    setDeleteError(null)
    try {
      await onDelete()
      router.push('/applications')
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : '削除に失敗しました',
      )
    }
  }

  async function handleSubmitConfirm() {
    try {
      await onSubmit()
      setSubmitDialogOpen(false)
    } catch {
      setSubmitDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/applications')}
          aria-label="一覧に戻る"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          戻る
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">
            {application.applicationNumber}
          </h1>
          <StatusBadge status={application.status} />
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/applications/${application.id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" />
                編集
              </Link>
            </Button>
          ) : null}
          {canSubmit ? (
            <Button
              size="sm"
              onClick={() => setSubmitDialogOpen(true)}
              disabled={isSubmitting}
            >
              <Send className="mr-1 h-4 w-4" />
              申請する
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              削除
            </Button>
          ) : null}
        </div>
      </div>

      {deleteError ? (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {deleteError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>申請情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">利用日</dt>
              <dd className="text-sm font-medium">
                {formatDate(application.expenseDate)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">金額</dt>
              <dd className="text-sm font-medium">
                {formatCurrency(application.amount)}
              </dd>
            </div>
            {application.proposedAmount !== null ? (
              <div>
                <dt className="text-sm text-muted-foreground">申請額</dt>
                <dd className="text-sm font-medium">
                  {formatCurrency(application.proposedAmount)}
                </dd>
              </div>
            ) : null}
            {application.finalAmount !== null ? (
              <div>
                <dt className="text-sm text-muted-foreground">確定額</dt>
                <dd className="text-sm font-medium">
                  {formatCurrency(application.finalAmount)}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">説明</dt>
              <dd className="text-sm font-medium">{application.description}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">現金支払い</dt>
              <dd className="text-sm font-medium">
                {application.isCashPayment ? 'はい' : 'いいえ'}
              </dd>
            </div>
            {application.internalCategoryName ? (
              <div>
                <dt className="text-sm text-muted-foreground">カテゴリ</dt>
                <dd className="text-sm font-medium">
                  {application.internalCategoryName}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-sm text-muted-foreground">作成日時</dt>
              <dd className="text-sm">{formatDateTime(application.createdAt)}</dd>
            </div>
            {application.submittedAt ? (
              <div>
                <dt className="text-sm text-muted-foreground">申請日時</dt>
                <dd className="text-sm">
                  {formatDateTime(application.submittedAt)}
                </dd>
              </div>
            ) : null}
            {application.approvedAt ? (
              <div>
                <dt className="text-sm text-muted-foreground">承認日時</dt>
                <dd className="text-sm">
                  {formatDateTime(application.approvedAt)}
                </dd>
              </div>
            ) : null}
            {application.approvedByName ? (
              <div>
                <dt className="text-sm text-muted-foreground">承認者</dt>
                <dd className="text-sm">{application.approvedByName}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>領収書</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReceiptGallery receipts={application.receipts} readOnly />
          {application.receipts
            .filter((r) => r.ocrResult)
            .map((receipt) => (
              <div key={receipt.id} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {receipt.fileName}
                </p>
                <OcrResultEditor
                  ocrResult={receipt.ocrResult!}
                  onSave={() => {}}
                  isSaving={false}
                  readOnly
                />
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>コメント履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <CommentTimeline comments={application.comments} />
        </CardContent>
      </Card>

      <SubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        onConfirm={handleSubmitConfirm}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
