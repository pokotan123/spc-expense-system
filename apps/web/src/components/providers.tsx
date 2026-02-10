'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from '@/components/ui/toaster'

interface ProvidersProps {
  readonly children: ReactNode
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30秒
        gcTime: 10 * 60 * 1000, // 10分
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}
