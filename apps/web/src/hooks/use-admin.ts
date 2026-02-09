'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiClient } from '@/lib/api-client'
import type {
  ExpenseApplication,
  PaginatedResponse,
} from '@/lib/types'
import type { ApplicationStatus } from '@/lib/constants'

// Query keys
const adminKeys = {
  all: ['admin'] as const,
  applications: () => [...adminKeys.all, 'applications'] as const,
  applicationList: (filters: Record<string, unknown>) =>
    [...adminKeys.applications(), 'list', filters] as const,
  applicationDetail: (id: string) =>
    [...adminKeys.applications(), 'detail', id] as const,
  payments: () => [...adminKeys.all, 'payments'] as const,
  paymentList: (filters: Record<string, unknown>) =>
    [...adminKeys.payments(), 'list', filters] as const,
  readyForPayment: () => [...adminKeys.payments(), 'ready'] as const,
}

interface AdminApplicationFilters {
  readonly page?: number
  readonly limit?: number
  readonly status?: ApplicationStatus | ApplicationStatus[]
  readonly search?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly departmentId?: string
  readonly sort?: string
  readonly order?: 'asc' | 'desc'
}

export function useAdminApplicationList(filters: AdminApplicationFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters

  return useQuery({
    queryKey: adminKeys.applicationList({ page, limit, ...rest }),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('limit', String(limit))

      if (rest.status) {
        const statuses = Array.isArray(rest.status) ? rest.status : [rest.status]
        for (const s of statuses) {
          searchParams.append('status', s)
        }
      }
      if (rest.search) searchParams.set('search', rest.search)
      if (rest.dateFrom) searchParams.set('dateFrom', rest.dateFrom)
      if (rest.dateTo) searchParams.set('dateTo', rest.dateTo)
      if (rest.departmentId) searchParams.set('departmentId', rest.departmentId)
      if (rest.sort) searchParams.set('sort', rest.sort)
      if (rest.order) searchParams.set('order', rest.order)

      const response = await apiGet<PaginatedResponse<ExpenseApplication>>(
        `/admin/applications?${searchParams.toString()}`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請一覧の取得に失敗しました')
      }
      return response.data
    },
  })
}

export function useAdminApplicationDetail(id: string) {
  return useQuery({
    queryKey: adminKeys.applicationDetail(id),
    queryFn: async () => {
      const response = await apiGet<ExpenseApplication>(
        `/admin/applications/${id}`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の取得に失敗しました')
      }
      return response.data
    },
    enabled: Boolean(id),
  })
}

interface ApproveInput {
  readonly applicationId: string
  readonly internalCategoryId?: string
  readonly finalAmount?: number
  readonly comment?: string
}

export function useApproveApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ applicationId, ...data }: ApproveInput) => {
      const response = await apiPost<ExpenseApplication>(
        `/admin/applications/${applicationId}/approve`,
        {
          internal_category_id: data.internalCategoryId,
          final_amount: data.finalAmount,
          comment: data.comment,
        },
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '承認に失敗しました')
      }
      return response.data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applicationDetail(variables.applicationId),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications(),
      })
    },
  })
}

export function useReturnApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      applicationId,
      comment,
    }: {
      readonly applicationId: string
      readonly comment: string
    }) => {
      const response = await apiPost<ExpenseApplication>(
        `/admin/applications/${applicationId}/return`,
        { comment },
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '差戻しに失敗しました')
      }
      return response.data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applicationDetail(variables.applicationId),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications(),
      })
    },
  })
}

export function useRejectApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      applicationId,
      comment,
    }: {
      readonly applicationId: string
      readonly comment: string
    }) => {
      const response = await apiPost<ExpenseApplication>(
        `/admin/applications/${applicationId}/reject`,
        { comment },
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '却下に失敗しました')
      }
      return response.data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applicationDetail(variables.applicationId),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applications(),
      })
    },
  })
}

interface PaymentApplication {
  readonly id: string
  readonly applicationNumber: string
  readonly memberName: string
  readonly amount: number
  readonly finalAmount: number | null
  readonly approvedAt: string | null
}

export function useReadyForPayment() {
  return useQuery({
    queryKey: adminKeys.readyForPayment(),
    queryFn: async () => {
      const response = await apiGet<readonly PaymentApplication[]>(
        '/admin/payments/ready',
      )
      if (!response.success || !response.data) {
        throw new Error(
          response.error ?? '振込対象の取得に失敗しました',
        )
      }
      return response.data
    },
  })
}

interface PaymentBatch {
  readonly batchId: string
  readonly count: number
  readonly totalAmount: number
}

export function useGeneratePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (applicationIds: readonly string[]) => {
      const response = await apiPost<PaymentBatch>(
        '/admin/payments/generate',
        { application_ids: applicationIds },
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '振込データの生成に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.readyForPayment(),
      })
      void queryClient.invalidateQueries({
        queryKey: adminKeys.payments(),
      })
    },
  })
}

export function useDownloadZengin() {
  return useMutation({
    mutationFn: async (batchId: string) => {
      const response = await apiClient.get(
        `/admin/payments/${batchId}/download`,
        { responseType: 'blob' },
      )
      const blob = new Blob([response.data as BlobPart])
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${batchId}.dat`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
  })
}
