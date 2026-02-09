'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/application/status-badge'
import { useApplicationList } from '@/hooks/use-applications'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  PAGINATION,
  type ApplicationStatus,
} from '@/lib/constants'

type StatusFilter = ApplicationStatus | 'ALL'

const STATUS_TABS: readonly { readonly value: StatusFilter; readonly label: string }[] = [
  { value: 'ALL', label: 'すべて' },
  { value: APPLICATION_STATUSES.DRAFT, label: APPLICATION_STATUS_LABELS.DRAFT },
  { value: APPLICATION_STATUSES.SUBMITTED, label: APPLICATION_STATUS_LABELS.SUBMITTED },
  { value: APPLICATION_STATUSES.APPROVED, label: APPLICATION_STATUS_LABELS.APPROVED },
  { value: APPLICATION_STATUSES.REJECTED, label: APPLICATION_STATUS_LABELS.REJECTED },
  { value: APPLICATION_STATUSES.RETURNED, label: APPLICATION_STATUS_LABELS.RETURNED },
]

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useApplicationList({
    page,
    limit: PAGINATION.DEFAULT_LIMIT,
    status: statusFilter,
    search: searchQuery || undefined,
  })

  function handleStatusChange(value: string) {
    setStatusFilter(value as StatusFilter)
    setPage(1)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">経費申請一覧</h1>
        <Button asChild>
          <Link href="/applications/new">
            <Plus className="mr-2 h-4 w-4" />
            新規申請
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">申請一覧</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="摘要で検索..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9"
                aria-label="申請を検索"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <TableSkeleton />
          ) : data && data.items.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請番号</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>摘要</TableHead>
                      <TableHead>経費日</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Link
                            href={`/applications/${app.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {app.applicationNumber}
                          </Link>
                        </TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {data.total}件中 {(page - 1) * PAGINATION.DEFAULT_LIMIT + 1}-
                  {Math.min(page * PAGINATION.DEFAULT_LIMIT, data.total)}件
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
