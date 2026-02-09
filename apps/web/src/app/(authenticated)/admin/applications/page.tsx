'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/application/status-badge'
import { useAdminApplicationList } from '@/hooks/use-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  PAGINATION,
  type ApplicationStatus,
} from '@/lib/constants'

type SortField = 'submittedAt' | 'amount' | 'expenseDate'
type SortOrder = 'asc' | 'desc'

const STATUS_OPTIONS: readonly {
  readonly value: ApplicationStatus
  readonly label: string
}[] = [
  { value: APPLICATION_STATUSES.SUBMITTED, label: APPLICATION_STATUS_LABELS.SUBMITTED },
  { value: APPLICATION_STATUSES.APPROVED, label: APPLICATION_STATUS_LABELS.APPROVED },
  { value: APPLICATION_STATUSES.REJECTED, label: APPLICATION_STATUS_LABELS.REJECTED },
  { value: APPLICATION_STATUSES.RETURNED, label: APPLICATION_STATUS_LABELS.RETURNED },
  { value: APPLICATION_STATUSES.DRAFT, label: APPLICATION_STATUS_LABELS.DRAFT },
]

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-40 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export default function AdminApplicationsPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<ApplicationStatus[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('submittedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useAdminApplicationList({
    page,
    limit: PAGINATION.DEFAULT_LIMIT,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    search: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort: sortField,
    order: sortOrder,
  })

  function handleStatusToggle(status: ApplicationStatus) {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    )
    setPage(1)
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  function getSortIndicator(field: SortField): string {
    if (sortField !== field) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  function handleClearFilters() {
    setSelectedStatuses([])
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
    setPage(1)
  }

  const totalPages = data?.totalPages ?? 1
  const hasActiveFilters =
    selectedStatuses.length > 0 || dateFrom || dateTo || searchQuery

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">申請管理</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">申請一覧</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="会員名・摘要で検索..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                  aria-label="申請を検索"
                />
              </div>
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="icon"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-label="フィルターを表示"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <p className="mb-2 text-sm font-medium">ステータス</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleStatusToggle(option.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedStatuses.includes(option.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background hover:bg-accent'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="dateFrom" className="text-sm font-medium">
                    申請日（開始）
                  </label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="dateTo" className="text-sm font-medium">
                    申請日（終了）
                  </label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
              </div>

              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  フィルターをクリア
                </Button>
              ) : null}
            </div>
          ) : null}

          {hasActiveFilters && !showFilters ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">絞り込み中:</span>
              {selectedStatuses.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {APPLICATION_STATUS_LABELS[s]}
                </Badge>
              ))}
              {dateFrom || dateTo ? (
                <Badge variant="secondary" className="text-xs">
                  {dateFrom || '...'}〜{dateTo || '...'}
                </Badge>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleClearFilters}
              >
                クリア
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <TableSkeleton />
          ) : data && data.items.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請番号</TableHead>
                      <TableHead>会員名</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>摘要</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handleSort('expenseDate')}
                          className="font-medium hover:text-foreground"
                        >
                          経費日{getSortIndicator('expenseDate')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort('amount')}
                          className="font-medium hover:text-foreground"
                        >
                          金額{getSortIndicator('amount')}
                        </button>
                      </TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {app.applicationNumber}
                        </TableCell>
                        <TableCell>{app.memberName}</TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {app.description}
                        </TableCell>
                        <TableCell>{formatDate(app.expenseDate)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(app.amount)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/applications/${app.id}`}>
                              詳細
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {data.total}件中 {(page - 1) * PAGINATION.DEFAULT_LIMIT + 1}
                  -{Math.min(page * PAGINATION.DEFAULT_LIMIT, data.total)}件
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    前へ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    次へ
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              該当する申請はありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
