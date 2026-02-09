'use client'

import Link from 'next/link'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/application/status-badge'
import { useDashboardStats, useRecentApplications } from '@/hooks/use-applications'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

interface StatCardProps {
  readonly title: string
  readonly count: number
  readonly amount: number
  readonly icon: React.ElementType
  readonly iconColor: string
}

function StatCard({ title, count, amount, icon: Icon, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{count}件</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(amount)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-6">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecentListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { memberName } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recent, isLoading: recentLoading } = useRecentApplications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">マイページ</h1>
        <p className="text-muted-foreground">
          {memberName}さん、お疲れ様です
        </p>
      </div>

      {statsLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="全申請"
            count={stats.totalCount}
            amount={stats.totalAmount}
            icon={FileText}
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="申請中"
            count={stats.pendingCount}
            amount={stats.pendingAmount}
            icon={Clock}
            iconColor="bg-yellow-50 text-yellow-600"
          />
          <StatCard
            title="承認済"
            count={stats.approvedCount}
            amount={stats.approvedAmount}
            icon={CheckCircle}
            iconColor="bg-green-50 text-green-600"
          />
          <StatCard
            title="却下"
            count={stats.rejectedCount}
            amount={stats.rejectedAmount}
            icon={XCircle}
            iconColor="bg-red-50 text-red-600"
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">最近の申請</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/applications">
              一覧を見る
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <RecentListSkeleton />
          ) : recent && recent.items.length > 0 ? (
            <ul className="space-y-3" aria-label="最近の申請一覧">
              {recent.items.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/applications/${app.id}`}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <StatusBadge status={app.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {app.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {app.applicationNumber} ・ {formatDate(app.expenseDate)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatCurrency(app.amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              申請はまだありません
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button asChild>
          <Link href="/applications/new">新規申請を作成</Link>
        </Button>
      </div>
    </div>
  )
}
