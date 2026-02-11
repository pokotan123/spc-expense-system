'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  RotateCcw,
  XCircle,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/application/status-badge'
import { CommentTimeline } from '@/components/application/comment-timeline'
import { CommentForm } from '@/components/application/comment-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useAdminApplicationDetail,
  useApproveApplication,
  useReturnApplication,
  useRejectApplication,
  useAdminAddComment,
  useCategoryList,
} from '@/hooks/use-admin'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate, formatDateTime, formatFileSize } from '@/lib/format'
import { APPLICATION_STATUSES } from '@/lib/constants'
import type { Receipt } from '@/lib/types'

type ActionType = 'approve' | 'return' | 'reject'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}

function ReceiptViewer({ receipts }: { readonly receipts: readonly Receipt[] }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('')

  if (receipts.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        領収書はありません
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {receipts.map((receipt) => {
          const isImage = receipt.mimeType.startsWith('image/')
          return (
            <div key={receipt.id} className="flex flex-col rounded-lg border p-3">
              {isImage && receipt.fileUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewUrl(receipt.fileUrl!)
                    setPreviewName(receipt.fileName)
                  }}
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
              <p className="truncate text-sm font-medium">{receipt.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(receipt.fileSize)}
              </p>
              {receipt.ocrResult ? (
                receipt.ocrResult.status === 'COMPLETED' ? (
                  <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-2">
                    <p className="text-xs font-medium text-muted-foreground">OCR結果</p>
                    {receipt.ocrResult.extractedStoreName ? (
                      <p className="text-xs">店名: {receipt.ocrResult.extractedStoreName}</p>
                    ) : null}
                    {receipt.ocrResult.extractedDate ? (
                      <p className="text-xs">日付: {receipt.ocrResult.extractedDate}</p>
                    ) : null}
                    {receipt.ocrResult.extractedAmount ? (
                      <p className="text-xs">金額: {receipt.ocrResult.extractedAmount}</p>
                    ) : null}
                  </div>
                ) : receipt.ocrResult.status === 'PROCESSING' ? (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 p-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs text-muted-foreground">OCR処理中...</p>
                  </div>
                ) : receipt.ocrResult.status === 'FAILED' ? (
                  <div className="mt-2 rounded-md bg-destructive/10 p-2">
                    <p className="text-xs text-destructive">OCR読み取りに失敗しました。手動で入力してください。</p>
                  </div>
                ) : null
              ) : null}
            </div>
          )
        })}
      </div>

      <Dialog
        open={previewUrl !== null}
        onOpenChange={(open) => { if (!open) setPreviewUrl(null) }}
      >
        <DialogContent className="max-w-3xl">
          <DialogTitle>{previewName}</DialogTitle>
          {previewUrl ? (
            <img src={previewUrl} alt={previewName} className="w-full rounded-md" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AdminApplicationDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>
}) {
  const { id } = use(params)
  const { toast } = useToast()
  const { data: application, isLoading } = useAdminApplicationDetail(id)

  const approveMutation = useApproveApplication()
  const returnMutation = useReturnApplication()
  const rejectMutation = useRejectApplication()
  const addCommentMutation = useAdminAddComment(id)

  const { data: categories } = useCategoryList()

  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [comment, setComment] = useState('')
  const [finalAmount, setFinalAmount] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const isSubmitted = application?.status === APPLICATION_STATUSES.SUBMITTED
  const isPending =
    approveMutation.isPending ||
    returnMutation.isPending ||
    rejectMutation.isPending

  function openActionDialog(type: ActionType) {
    setActionType(type)
    setComment('')
    setSelectedCategoryId('')
    if (type === 'approve' && application) {
      setFinalAmount(String(application.amount))
    }
  }

  async function handleAction() {
    if (!actionType) return

    try {
      switch (actionType) {
        case 'approve':
          if (!selectedCategoryId) {
            toast({
              title: 'カテゴリを選択してください',
              variant: 'destructive',
            })
            return
          }
          await approveMutation.mutateAsync({
            applicationId: id,
            internalCategoryId: selectedCategoryId,
            finalAmount: finalAmount ? Number(finalAmount) : undefined,
            comment: comment || undefined,
          })
          toast({ title: '承認しました' })
          break
        case 'return':
          if (!comment.trim()) {
            toast({
              title: 'コメントを入力してください',
              variant: 'destructive',
            })
            return
          }
          await returnMutation.mutateAsync({
            applicationId: id,
            comment,
          })
          toast({ title: '差戻ししました' })
          break
        case 'reject':
          if (!comment.trim()) {
            toast({
              title: 'コメントを入力してください',
              variant: 'destructive',
            })
            return
          }
          await rejectMutation.mutateAsync({
            applicationId: id,
            comment,
          })
          toast({ title: '却下しました' })
          break
      }
      setActionType(null)
    } catch (error) {
      toast({
        title: '処理に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return <DetailSkeleton />

  if (!application) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">申請が見つかりません</p>
        <Button variant="link" asChild className="mt-4">
          <Link href="/admin/applications">一覧に戻る</Link>
        </Button>
      </div>
    )
  }

  const actionLabels: Record<ActionType, { readonly title: string; readonly description: string; readonly buttonLabel: string }> = {
    approve: {
      title: '申請を承認しますか？',
      description: '承認後、振込処理の対象になります。',
      buttonLabel: '承認する',
    },
    return: {
      title: '申請を差戻ししますか？',
      description: '差戻し理由をコメントに入力してください。申請者は修正して再提出できます。',
      buttonLabel: '差戻しする',
    },
    reject: {
      title: '申請を却下しますか？',
      description: '却下理由をコメントに入力してください。この操作は取り消せません。',
      buttonLabel: '却下する',
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/applications" aria-label="一覧に戻る">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{application.applicationNumber}</h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {application.memberName}
          </p>
        </div>
        {isSubmitted ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openActionDialog('return')}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              差戻し
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openActionDialog('reject')}
            >
              <XCircle className="mr-2 h-4 w-4" />
              却下
            </Button>
            <Button size="sm" onClick={() => openActionDialog('approve')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              承認
            </Button>
          </div>
        ) : null}
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
                  <dd className="text-sm font-medium">{formatDate(application.expenseDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">申請金額</dt>
                  <dd className="text-lg font-bold">{formatCurrency(application.amount)}</dd>
                </div>
                {application.proposedAmount !== null ? (
                  <div>
                    <dt className="text-sm text-muted-foreground">補助金額</dt>
                    <dd className="text-sm font-medium">
                      {formatCurrency(application.proposedAmount)}
                    </dd>
                  </div>
                ) : null}
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
                    <dd className="text-sm font-medium">{application.internalCategoryName}</dd>
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
                      {application.approvedByName ? ` (${application.approvedByName})` : ''}
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
              <ReceiptViewer receipts={application.receipts ?? []} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">コメント履歴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommentTimeline comments={application.comments ?? []} />
              <Separator />
              <CommentForm
                onSubmit={async (commentText) => {
                  await addCommentMutation.mutateAsync({
                    comment: commentText,
                    commentType: 'GENERAL',
                  })
                  toast({ title: 'コメントを追加しました' })
                }}
                isPending={addCommentMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      {actionType ? (
        <Dialog
          open={actionType !== null}
          onOpenChange={(open) => { if (!open) setActionType(null) }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionLabels[actionType].title}</DialogTitle>
              <DialogDescription>
                {actionLabels[actionType].description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === 'approve' ? (
                <>
                <div className="space-y-2">
                  <Label htmlFor="category">社内カテゴリ <span className="text-destructive">*</span></Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finalAmount">確定金額（円）</Label>
                  <Input
                    id="finalAmount"
                    type="number"
                    min={0}
                    step={1}
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    申請金額: {formatCurrency(application.amount)}
                    {!finalAmount ? '（空欄の場合、申請金額が確定金額になります）' : null}
                  </p>
                  {finalAmount && Math.abs(Number(finalAmount) - application.amount) / application.amount > 0.5 ? (
                    <p className="text-xs text-orange-600">
                      申請金額との差異が50%以上あります。金額をご確認ください。
                    </p>
                  ) : null}
                </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="action-comment">
                  コメント
                  {actionType !== 'approve' ? (
                    <span className="text-destructive"> *</span>
                  ) : (
                    '（任意）'
                  )}
                </Label>
                <Textarea
                  id="action-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? '承認コメント'
                      : actionType === 'return'
                        ? '差戻し理由を入力してください'
                        : '却下理由を入力してください'
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionType(null)}
                disabled={isPending}
              >
                キャンセル
              </Button>
              <Button
                variant={actionType === 'reject' ? 'destructive' : 'default'}
                onClick={handleAction}
                disabled={isPending}
              >
                {isPending ? '処理中...' : actionLabels[actionType].buttonLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
