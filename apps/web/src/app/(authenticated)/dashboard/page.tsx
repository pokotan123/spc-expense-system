'use client'

import Link from 'next/link'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ClipboardCheck,
  CreditCard,
  Tags,
  Shield,
  PenLine,
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
import { useAdminApplicationList } from '@/hooks/use-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'
import { MEMBER_ROLES } from '@/lib/constants'

interface StatCardProps {
  readonly title: string
  readonly count: number
  readonly amount: number
  readonly icon: React.ElementType
  readonly iconColor: string
  readonly href?: string
}

function StatCard({ title, count, amount, icon: Icon, iconColor, href }: StatCardProps) {
  const content = (
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
  )

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="transition-shadow hover:shadow-md">
          {content}
        </Card>
      </Link>
    )
  }

  return <Card>{content}</Card>
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

interface AdminQuickLinkProps {
  readonly href: string
  readonly label: string
  readonly description: string
  readonly icon: React.ElementType
  readonly iconColor: string
}

function AdminQuickLink({ href, label, description, icon: Icon, iconColor }: AdminQuickLinkProps) {
  return (
    <Link href={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  )
}

function AdminDashboard({ memberName }: { readonly memberName: string }) {
  const { data: pendingApps, isLoading: pendingLoading } = useAdminApplicationList({
    status: 'SUBMITTED',
    limit: 5,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
        <p className="text-muted-foreground">
          {memberName}さん、お疲れ様です
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminQuickLink
          href="/admin/applications"
          label="申請管理"
          description="申請の確認・承認・差戻し"
          icon={ClipboardCheck}
          iconColor="bg-blue-50 text-blue-600"
        />
        <AdminQuickLink
          href="/admin/payments"
          label="振込データ"
          description="振込データ生成・ダウンロード"
          icon={CreditCard}
          iconColor="bg-green-50 text-green-600"
        />
        <AdminQuickLink
          href="/admin/categories"
          label="カテゴリ管理"
          description="内部カテゴリの追加・編集"
          icon={Tags}
          iconColor="bg-purple-50 text-purple-600"
        />
        <AdminQuickLink
          href="/admin/audit"
          label="監査ログ"
          description="操作履歴の確認"
          icon={Shield}
          iconColor="bg-orange-50 text-orange-600"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            承認待ちの申請
            {pendingApps ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pendingApps.total}件)
              </span>
            ) : null}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/applications?status=SUBMITTED">
              すべて見る
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <RecentListSkeleton />
          ) : pendingApps && pendingApps.items.length > 0 ? (
            <ul className="space-y-3" aria-label="承認待ちの申請一覧">
              {pendingApps.items.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/admin/applications/${app.id}`}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <StatusBadge status={app.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {app.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {app.applicationNumber} ・ {app.memberName} ・ {formatDate(app.expenseDate)}
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
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-12 w-12 text-green-400" />
              <p className="text-sm text-muted-foreground">
                承認待ちの申請はありません
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MemberDashboard({ memberName }: { readonly memberName: string }) {
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="全申請"
              count={stats.totalCount}
              amount={stats.totalAmount}
              icon={FileText}
              iconColor="bg-blue-50 text-blue-600"
              href="/applications"
            />
            <StatCard
              title="申請中"
              count={stats.pendingCount}
              amount={stats.pendingAmount}
              icon={Clock}
              iconColor="bg-yellow-50 text-yellow-600"
              href="/applications?status=SUBMITTED"
            />
            <StatCard
              title="承認済"
              count={stats.approvedCount}
              amount={stats.approvedAmount}
              icon={CheckCircle}
              iconColor="bg-green-50 text-green-600"
              href="/applications?status=APPROVED"
            />
            <StatCard
              title="却下"
              count={stats.rejectedCount}
              amount={stats.rejectedAmount}
              icon={XCircle}
              iconColor="bg-red-50 text-red-600"
              href="/applications?status=REJECTED"
            />
          </div>
          {stats.draftCount > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="下書き"
                count={stats.draftCount}
                amount={stats.draftAmount}
                icon={PenLine}
                iconColor="bg-gray-50 text-gray-500"
                href="/applications?status=DRAFT"
              />
            </div>
          ) : null}
        </>
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
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-muted-foreground">
                申請はまだありません
              </p>
              <Button asChild size="sm">
                <Link href="/applications/new">最初の申請を作成する</Link>
              </Button>
            </div>
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

export default function DashboardPage() {
  const { memberName, role } = useAuthStore()
  const isAdmin = role === MEMBER_ROLES.ADMIN

  if (isAdmin) {
    return <AdminDashboard memberName={memberName ?? ''} />
  }

  return <MemberDashboard memberName={memberName ?? ''} />
}
