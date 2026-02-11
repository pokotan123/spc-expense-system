'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuditLogs } from '@/hooks/use-admin'
import { formatDateTime } from '@/lib/format'

const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'CREATE_APPLICATION',
  'UPDATE_APPLICATION',
  'DELETE_APPLICATION',
  'SUBMIT_APPLICATION',
  'APPROVE_APPLICATION',
  'RETURN_APPLICATION',
  'REJECT_APPLICATION',
  'CREATE_CATEGORY',
  'UPDATE_CATEGORY',
  'DELETE_CATEGORY',
  'GENERATE_PAYMENT',
] as const

const AUDIT_ENTITIES = [
  'Member',
  'ExpenseApplication',
  'InternalCategory',
  'Payment',
] as const

const ACTION_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOGIN: 'secondary',
  LOGOUT: 'secondary',
  CREATE_APPLICATION: 'default',
  UPDATE_APPLICATION: 'outline',
  DELETE_APPLICATION: 'destructive',
  SUBMIT_APPLICATION: 'default',
  APPROVE_APPLICATION: 'default',
  RETURN_APPLICATION: 'outline',
  REJECT_APPLICATION: 'destructive',
  CREATE_CATEGORY: 'default',
  UPDATE_CATEGORY: 'outline',
  DELETE_CATEGORY: 'destructive',
  GENERATE_PAYMENT: 'default',
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<string>('')
  const [entity, setEntity] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading, refetch } = useAuditLogs({
    page,
    limit: 20,
    action: action || undefined,
    entity: entity || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  function handleReset() {
    setPage(1)
    setAction('')
    setEntity('')
    setDateFrom('')
    setDateTo('')
  }

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">監査ログ</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">フィルター</CardTitle>
          <CardDescription>条件を指定してログを検索します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label
                htmlFor="action-filter"
                className="text-sm font-medium text-muted-foreground"
              >
                アクション
              </label>
              <Select value={action} onValueChange={(v) => { setAction(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {AUDIT_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="entity-filter"
                className="text-sm font-medium text-muted-foreground"
              >
                エンティティ
              </label>
              <Select value={entity} onValueChange={(v) => { setEntity(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger id="entity-filter">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {AUDIT_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="date-from"
                className="text-sm font-medium text-muted-foreground"
              >
                開始日
              </label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="date-to"
                className="text-sm font-medium text-muted-foreground"
              >
                終了日
              </label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              リセット
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit log table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ログ一覧</CardTitle>
          {data ? (
            <CardDescription>
              全{data.total}件中 {(page - 1) * 20 + 1}-
              {Math.min(page * 20, data.total)}件を表示
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : items.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      <TableHead>アクション</TableHead>
                      <TableHead>エンティティ</TableHead>
                      <TableHead>エンティティID</TableHead>
                      <TableHead>IPアドレス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ACTION_BADGE_VARIANT[log.action] ?? 'outline'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entity}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {log.entityId ?? '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.ipAddress ?? '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    前へ
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    次へ
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              監査ログはありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
