'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete, apiClient } from '@/lib/api-client'
import { transformApplication } from '@/hooks/use-applications'
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
  categories: () => [...adminKeys.all, 'categories'] as const,
  auditLogs: () => [...adminKeys.all, 'auditLogs'] as const,
  auditLogList: (filters: Record<string, unknown>) =>
    [...adminKeys.auditLogs(), 'list', filters] as const,
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
    queryFn: async (): Promise<PaginatedResponse<ExpenseApplication>> => {
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

      const raw = await apiClient.get(`/admin/applications?${searchParams.toString()}`)
      const body = raw.data as { success: boolean; data?: unknown[]; meta?: { total: number; page: number; limit: number; totalPages: number }; error?: string }
      if (!body.success) {
        throw new Error(body.error ?? '申請一覧の取得に失敗しました')
      }
      const items = (body.data ?? []).map((item: unknown) =>
        transformApplication(item as never),
      )
      return {
        items,
        total: body.meta?.total ?? 0,
        page: body.meta?.page ?? 1,
        limit: body.meta?.limit ?? 20,
        totalPages: body.meta?.totalPages ?? 1,
      }
    },
  })
}

export function useAdminApplicationDetail(id: string) {
  return useQuery({
    queryKey: adminKeys.applicationDetail(id),
    queryFn: async () => {
      const raw = await apiClient.get(`/admin/applications/${id}`)
      const body = raw.data as { success: boolean; data?: Record<string, unknown>; error?: string }
      if (!body.success || !body.data) {
        throw new Error(body.error ?? '申請の取得に失敗しました')
      }
      return transformApplication(body.data as never)
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

// Category types and hooks
interface Category {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly description: string | null
  readonly isActive: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export function useCategoryList(includeInactive = true) {
  return useQuery({
    queryKey: [...adminKeys.categories(), { includeInactive }],
    queryFn: async (): Promise<readonly Category[]> => {
      const params = includeInactive ? '?include_inactive=true' : ''
      const response = await apiGet<readonly Category[]>(
        `/admin/categories${params}`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'カテゴリ一覧の取得に失敗しました')
      }
      return response.data
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      readonly name: string
      readonly code: string
      readonly description?: string
    }) => {
      const response = await apiPost<Category>('/admin/categories', data)
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'カテゴリの作成に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.categories(),
      })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      readonly id: string
      readonly name?: string
      readonly code?: string
      readonly description?: string | null
      readonly is_active?: boolean
    }) => {
      const response = await apiPut<Category>(`/admin/categories/${id}`, data)
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'カテゴリの更新に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.categories(),
      })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiDelete(`/admin/categories/${id}`)
      if (!response.success) {
        throw new Error(response.error ?? 'カテゴリの削除に失敗しました')
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.categories(),
      })
    },
  })
}

export function useAdminAddComment(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      comment,
      commentType = 'GENERAL',
    }: {
      readonly comment: string
      readonly commentType?: string
    }) => {
      const response = await apiPost<unknown>(
        `/applications/${applicationId}/comments`,
        { comment, comment_type: commentType },
      )
      if (!response.success) {
        throw new Error(response.error ?? 'コメントの追加に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.applicationDetail(applicationId),
      })
    },
  })
}

// Audit log types and hooks
interface AuditLogEntry {
  readonly id: string
  readonly action: string
  readonly entity: string
  readonly entityId: string | null
  readonly memberId: string | null
  readonly details: Record<string, unknown> | null
  readonly ipAddress: string | null
  readonly createdAt: string
}

interface AuditLogFilters {
  readonly page?: number
  readonly limit?: number
  readonly action?: string
  readonly entity?: string
  readonly memberId?: string
  readonly dateFrom?: string
  readonly dateTo?: string
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const { page = 1, limit = 20, ...rest } = filters

  return useQuery({
    queryKey: adminKeys.auditLogList({ page, limit, ...rest }),
    queryFn: async (): Promise<PaginatedResponse<AuditLogEntry>> => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('limit', String(limit))

      if (rest.action) searchParams.set('action', rest.action)
      if (rest.entity) searchParams.set('entity', rest.entity)
      if (rest.memberId) searchParams.set('member_id', rest.memberId)
      if (rest.dateFrom) searchParams.set('date_from', rest.dateFrom)
      if (rest.dateTo) searchParams.set('date_to', rest.dateTo)

      const raw = await apiClient.get(`/admin/audit?${searchParams.toString()}`)
      const body = raw.data as {
        success: boolean
        data?: AuditLogEntry[]
        meta?: { total: number; page: number; limit: number; totalPages: number }
        error?: string
      }
      if (!body.success) {
        throw new Error(body.error ?? '監査ログの取得に失敗しました')
      }
      return {
        items: body.data ?? [],
        total: body.meta?.total ?? 0,
        page: body.meta?.page ?? 1,
        limit: body.meta?.limit ?? 20,
        totalPages: body.meta?.totalPages ?? 1,
      }
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
