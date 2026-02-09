'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { useAuthStore } from '@/stores/auth-store'

export default function AuthenticatedLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
