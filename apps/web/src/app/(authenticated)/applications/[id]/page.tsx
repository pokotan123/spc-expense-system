'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  Send,
  Trash2,
  FileText,
  ZoomIn,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/application/status-badge'
import { SubmitDialog } from '@/components/application/submit-dialog'
import { CommentTimeline } from '@/components/application/comment-timeline'
import {
  useApplicationDetail,
  useSubmitApplication,
  useDeleteApplication,
} from '@/hooks/use-applications'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate, formatDateTime, formatFileSize } from '@/lib/format'
import { APPLICATION_STATUSES } from '@/lib/constants'
import type { Receipt } from '@/lib/types'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function ReceiptGallery({
  receipts,
}: {
  readonly receipts: readonly Receipt[]
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')

  if (receipts.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        領収書はありません
      </p>
    )
  }

  function handlePreview(receipt: Receipt) {
    if (receipt.fileUrl && receipt.mimeType.startsWith('image/')) {
      setPreviewUrl(receipt.fileUrl)
      setPreviewName(receipt.fileName)
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {receipts.map((receipt) => {
          const isImage = receipt.mimeType.startsWith('image/')
          return (
            <div
              key={receipt.id}
              className="flex flex-col rounded-lg border p-3"
            >
              {isImage && receipt.fileUrl ? (
                <button
                  type="button"
                  onClick={() => handlePreview(receipt)}
                  className="group relative mb-2 aspect-[4/3] overflow-hidden rounded-md bg-muted"
                  aria-label={`${receipt.fileName}をプレビュー`}
                >
                  <img
                    src={receipt.fileUrl}
                    alt={receipt.fileName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              ) : (
                <div className="mb-2 flex aspect-[4/3] items-center justify-center rounded-md bg-muted">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <p className="truncate text-sm font-medium">
                {receipt.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(receipt.fileSize)}
              </p>

              {receipt.ocrResult &&
              receipt.ocrResult.status === 'COMPLETED' ? (
                <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    OCR結果
                  </p>
                  {receipt.ocrResult.extractedStoreName ? (
                    <p className="text-xs">
                      店名: {receipt.ocrResult.extractedStoreName}
                    </p>
                  ) : null}
                  {receipt.ocrResult.extractedDate ? (
                    <p className="text-xs">
                      日付: {receipt.ocrResult.extractedDate}
                    </p>
                  ) : null}
                  {receipt.ocrResult.extractedAmount ? (
                    <p className="text-xs">
                      金額: {receipt.ocrResult.extractedAmount}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <Dialog
        open={previewUrl !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogTitle>{previewName}</DialogTitle>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={previewName}
              className="w-full rounded-md"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ApplicationDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { data: application, isLoading } = useApplicationDetail(id)
  const submitMutation = useSubmitApplication()
  const deleteMutation = useDeleteApplication()
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  async function handleSubmit(comment?: string) {
    try {
      await submitMutation.mutateAsync({ id, comment })
      setShowSubmitDialog(false)
      toast({ title: '申請を提出しました' })
    } catch (error) {
      toast({
        title: '提出に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: '申請を削除しました' })
      router.push('/applications')
    } catch (error) {
      toast({
        title: '削除に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!application) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">申請が見つかりません</p>
        <Button variant="link" asChild className="mt-4">
          <Link href="/applications">一覧に戻る</Link>
        </Button>
      </div>
    )
  }

  const isDraft = application.status === APPLICATION_STATUSES.DRAFT
  const isReturned = application.status === APPLICATION_STATUSES.RETURNED
  const canEdit = isDraft || isReturned
  const canSubmit = isDraft || isReturned
  const canDelete = isDraft

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/applications" aria-label="一覧に戻る">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">
              {application.applicationNumber}
            </h1>
            <StatusBadge status={application.status} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/applications/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </Link>
            </Button>
          ) : null}
          {canSubmit ? (
            <Button size="sm" onClick={() => setShowSubmitDialog(true)}>
              <Send className="mr-2 h-4 w-4" />
              提出
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">申請内容</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">経費発生日</dt>
                  <dd className="text-sm font-medium">
                    {formatDate(application.expenseDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">申請金額</dt>
                  <dd className="text-lg font-bold">
                    {formatCurrency(application.amount)}
                  </dd>
                </div>
                {application.finalAmount !== null ? (
                  <div>
                    <dt className="text-sm text-muted-foreground">確定金額</dt>
                    <dd className="text-lg font-bold text-green-700">
                      {formatCurrency(application.finalAmount)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-sm text-muted-foreground">支払方法</dt>
                  <dd className="text-sm font-medium">
                    {application.isCashPayment ? (
                      <Badge variant="outline">現金立替</Badge>
                    ) : (
                      <Badge variant="secondary">その他</Badge>
                    )}
                  </dd>
                </div>
                {application.internalCategoryName ? (
                  <div>
                    <dt className="text-sm text-muted-foreground">社内カテゴリ</dt>
                    <dd className="text-sm font-medium">
                      {application.internalCategoryName}
                    </dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">摘要</dt>
                  <dd className="mt-1 text-sm">{application.description}</dd>
                </div>
              </dl>

              <Separator className="my-4" />

              <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="inline">作成日時: </dt>
                  <dd className="inline">{formatDateTime(application.createdAt)}</dd>
                </div>
                {application.submittedAt ? (
                  <div>
                    <dt className="inline">提出日時: </dt>
                    <dd className="inline">{formatDateTime(application.submittedAt)}</dd>
                  </div>
                ) : null}
                {application.approvedAt ? (
                  <div>
                    <dt className="inline">承認日時: </dt>
                    <dd className="inline">
                      {formatDateTime(application.approvedAt)}
                      {application.approvedByName
                        ? ` (${application.approvedByName})`
                        : ''}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">領収書</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptGallery receipts={application.receipts} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">コメント履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentTimeline comments={application.comments} />
            </CardContent>
          </Card>
        </div>
      </div>

      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmit}
        isSubmitting={submitMutation.isPending}
      />
    </div>
  )
}
