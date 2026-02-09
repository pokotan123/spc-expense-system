'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete, apiClient } from '@/lib/api-client'
import type {
  ExpenseApplication,
  DashboardStats,
  PaginatedResponse,
  ApplicationFormData,
} from '@/lib/types'
import type { ApplicationStatus } from '@/lib/constants'

// Query keys
const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...applicationKeys.lists(), filters] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
  stats: () => [...applicationKeys.all, 'stats'] as const,
}

interface ApplicationListParams {
  readonly page?: number
  readonly limit?: number
  readonly status?: ApplicationStatus | 'ALL'
  readonly search?: string
}

export function useDashboardStats() {
  return useQuery({
    queryKey: applicationKeys.stats(),
    queryFn: async () => {
      const response = await apiGet<DashboardStats>('/applications/stats')
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '統計データの取得に失敗しました')
      }
      return response.data
    },
  })
}

export function useApplicationList(params: ApplicationListParams = {}) {
  const { page = 1, limit = 20, status, search } = params

  return useQuery({
    queryKey: applicationKeys.list({ page, limit, status, search }),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('limit', String(limit))
      if (status && status !== 'ALL') {
        searchParams.set('status', status)
      }
      if (search) {
        searchParams.set('search', search)
      }

      const response = await apiGet<PaginatedResponse<ExpenseApplication>>(
        `/applications?${searchParams.toString()}`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請一覧の取得に失敗しました')
      }
      return response.data
    },
  })
}

export function useRecentApplications(limit = 5) {
  return useQuery({
    queryKey: applicationKeys.list({ limit, recent: true }),
    queryFn: async () => {
      const response = await apiGet<PaginatedResponse<ExpenseApplication>>(
        `/applications?limit=${limit}&sort=createdAt&order=desc`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請一覧の取得に失敗しました')
      }
      return response.data
    },
  })
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: async () => {
      const response = await apiGet<ExpenseApplication>(
        `/applications/${id}`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の取得に失敗しました')
      }
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const response = await apiPost<ExpenseApplication>('/applications', data)
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の作成に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.all,
      })
    },
  })
}

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const response = await apiPut<ExpenseApplication>(
        `/applications/${id}`,
        data,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の更新に失敗しました')
      }
      return response.data
    },
    onSuccess: (updatedApp) => {
      queryClient.setQueryData(
        applicationKeys.detail(id),
        updatedApp,
      )
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.stats(),
      })
    },
  })
}

export function useSubmitApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      comment,
    }: {
      readonly id: string
      readonly comment?: string
    }) => {
      const response = await apiPost<ExpenseApplication>(
        `/applications/${id}/submit`,
        { comment },
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の提出に失敗しました')
      }
      return response.data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(variables.id),
      })
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.stats(),
      })
    },
  })
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiDelete(`/applications/${id}`)
      if (!response.success) {
        throw new Error(response.error ?? '申請の削除に失敗しました')
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.all,
      })
    },
  })
}

export function useUploadReceipt(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiClient.post(
        `/applications/${applicationId}/receipts`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      if (!response.data?.success) {
        throw new Error(
          response.data?.error ?? '領収書のアップロードに失敗しました',
        )
      }
      return response.data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(applicationId),
      })
    },
  })
}

export function useDeleteReceipt(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const response = await apiDelete(
        `/applications/${applicationId}/receipts/${receiptId}`,
      )
      if (!response.success) {
        throw new Error(response.error ?? '領収書の削除に失敗しました')
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(applicationId),
      })
    },
  })
}
