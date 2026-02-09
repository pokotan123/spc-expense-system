'use client'

import { useState } from 'react'
import { Download, FileDown, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useReadyForPayment,
  useGeneratePayment,
  useDownloadZengin,
} from '@/hooks/use-admin'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/format'

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function AdminPaymentsPage() {
  const { toast } = useToast()
  const { data: applications, isLoading } = useReadyForPayment()
  const generateMutation = useGeneratePayment()
  const downloadMutation = useDownloadZengin()

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [lastBatchId, setLastBatchId] = useState<string | null>(null)

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleToggleAll() {
    if (!applications) return
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)))
    }
  }

  const selectedApplications = applications?.filter((a) =>
    selectedIds.has(a.id),
  ) ?? []

  const selectedTotalAmount = selectedApplications.reduce(
    (sum, a) => sum + (a.finalAmount ?? a.amount),
    0,
  )

  async function handleGenerate() {
    if (selectedIds.size === 0) return

    try {
      const result = await generateMutation.mutateAsync(
        Array.from(selectedIds),
      )
      setLastBatchId(result.batchId)
      setSelectedIds(new Set())
      toast({
        title: '振込データを生成しました',
        description: `バッチID: ${result.batchId} (${result.count}件, ${formatCurrency(result.totalAmount)})`,
      })
    } catch (error) {
      toast({
        title: '生成に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleDownload(batchId: string) {
    try {
      await downloadMutation.mutateAsync(batchId)
      toast({ title: 'ダウンロードを開始しました' })
    } catch (error) {
      toast({
        title: 'ダウンロードに失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  const isAllSelected =
    applications && applications.length > 0 && selectedIds.size === applications.length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">振込データ</h1>

      {/* Summary card */}
      {selectedIds.size > 0 ? (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">
                {selectedIds.size}件選択中
              </p>
              <p className="text-lg font-bold">
                合計: {formatCurrency(selectedTotalAmount)}
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              全銀データ生成
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Download last batch */}
      {lastBatchId ? (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">最新のバッチ</p>
              <p className="text-xs text-muted-foreground">
                バッチID: {lastBatchId}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleDownload(lastBatchId)}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              全銀ファイルダウンロード
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Ready for payment table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">振込対象</CardTitle>
          <CardDescription>
            承認済みの申請を選択して全銀データを生成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : applications && applications.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected ?? false}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="すべて選択"
                      />
                    </TableHead>
                    <TableHead>申請番号</TableHead>
                    <TableHead>会員名</TableHead>
                    <TableHead>承認日</TableHead>
                    <TableHead className="text-right">確定金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(app.id)}
                          onChange={() => handleToggle(app.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`${app.applicationNumber}を選択`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.applicationNumber}
                      </TableCell>
                      <TableCell>{app.memberName}</TableCell>
                      <TableCell>
                        {app.approvedAt ? formatDate(app.approvedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(app.finalAmount ?? app.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              振込対象の申請はありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
