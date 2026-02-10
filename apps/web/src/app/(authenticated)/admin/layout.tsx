'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { MEMBER_ROLES } from '@/lib/constants'

export default function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const router = useRouter()
  const { role } = useAuthStore()

  useEffect(() => {
    if (role && role !== MEMBER_ROLES.ADMIN) {
      router.replace('/dashboard')
    }
  }, [role, router])

  if (role !== MEMBER_ROLES.ADMIN) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">この機能にはアクセス権限がありません</p>
      </div>
    )
  }

  return <>{children}</>
}
