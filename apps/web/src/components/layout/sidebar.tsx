'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  ClipboardCheck,
  CreditCard,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/auth-store'
import { MEMBER_ROLES } from '@/lib/constants'

interface NavItem {
  readonly href: string
  readonly label: string
  readonly icon: React.ElementType
  readonly adminOnly?: boolean
}

const memberNavItems: readonly NavItem[] = [
  { href: '/dashboard', label: 'マイページ', icon: LayoutDashboard },
  { href: '/applications', label: '経費申請一覧', icon: FileText },
  { href: '/applications/new', label: '新規申請', icon: FilePlus },
]

const adminNavItems: readonly NavItem[] = [
  { href: '/admin/applications', label: '申請管理', icon: ClipboardCheck, adminOnly: true },
  { href: '/admin/payments', label: '振込データ', icon: CreditCard, adminOnly: true },
]

interface SidebarProps {
  readonly onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { role, clearAuth } = useAuthStore()
  const isAdmin = role === MEMBER_ROLES.ADMIN

  function handleLogout() {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <nav
      className="flex h-full flex-col gap-2 p-4"
      aria-label="メインナビゲーション"
    >
      <div className="mb-2 px-2">
        <h2 className="text-lg font-semibold tracking-tight">メニュー</h2>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {memberNavItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        {isAdmin ? (
          <>
            <Separator className="my-2" />
            <div className="px-2">
              <p className="text-xs font-semibold text-muted-foreground">
                管理者メニュー
              </p>
            </div>
            {adminNavItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href === '/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </>
        ) : null}
      </div>

      <Separator className="my-2" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ログアウト</AlertDialogTitle>
            <AlertDialogDescription>
              ログアウトしますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}
