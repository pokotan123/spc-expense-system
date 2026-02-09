'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { DashboardStats, ExpenseApplication, PaginatedResponse } from '@/lib/types'

const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  recent: () => [...dashboardKeys.all, 'recent'] as const,
}

export function useDashboard() {
  const stats = useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const response = await apiGet<DashboardStats>('/applications/stats')
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '統計データの取得に失敗しました')
      }
      return response.data
    },
  })

  const recent = useQuery({
    queryKey: dashboardKeys.recent(),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<ExpenseApplication>>(
        '/applications?limit=5&sort=createdAt&order=desc',
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '最近の申請の取得に失敗しました')
      }
      return response.data
    },
  })

  return { stats, recent }
}
