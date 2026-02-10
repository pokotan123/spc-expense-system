'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { ErrorBoundary } from '@/components/error-boundary'
import { useAuthStore } from '@/stores/auth-store'

export default function AuthenticatedLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, hydrated, router])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <AppShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  )
}
