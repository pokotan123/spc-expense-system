'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import { MEMBER_ROLES } from '@/lib/constants'

interface HeaderProps {
  readonly onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { memberName, role } = useAuthStore()

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="text-base font-semibold sm:text-lg">
          SPC経費精算システム
        </h1>

        <div className="ml-auto flex items-center gap-3">
          {role === MEMBER_ROLES.ADMIN ? (
            <Badge variant="info">管理者</Badge>
          ) : null}
          {memberName ? (
            <span className="text-sm text-muted-foreground">{memberName}</span>
          ) : null}
        </div>
      </div>
    </header>
  )
}
