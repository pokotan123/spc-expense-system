'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete, apiClient } from '@/lib/api-client'
import type {
  ExpenseApplication,
  ApplicationComment,
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

interface ApiDashboardResponse {
  readonly totalApplications: number
  readonly totalAmount: number
  readonly byStatus: Readonly<Record<string, { readonly count: number; readonly amount: number }>>
  readonly recentApplications: readonly unknown[]
}

export function useDashboardStats() {
  return useQuery({
    queryKey: applicationKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiGet<ApiDashboardResponse>('/applications/dashboard')
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '統計データの取得に失敗しました')
      }
      const d = response.data
      return {
        totalCount: d.totalApplications,
        totalAmount: d.totalAmount,
        pendingCount: (d.byStatus['SUBMITTED']?.count ?? 0),
        pendingAmount: (d.byStatus['SUBMITTED']?.amount ?? 0),
        approvedCount: (d.byStatus['APPROVED']?.count ?? 0),
        approvedAmount: (d.byStatus['APPROVED']?.amount ?? 0),
        rejectedCount: (d.byStatus['REJECTED']?.count ?? 0),
        rejectedAmount: (d.byStatus['REJECTED']?.amount ?? 0),
      }
    },
  })
}

export function useApplicationList(params: ApplicationListParams = {}) {
  const { page = 1, limit = 20, status, search } = params

  return useQuery({
    queryKey: applicationKeys.list({ page, limit, status, search }),
    queryFn: async (): Promise<PaginatedResponse<ExpenseApplication>> => {
      const searchParams = new URLSearchParams()
      searchParams.set('page', String(page))
      searchParams.set('limit', String(limit))
      if (status && status !== 'ALL') {
        searchParams.set('status', status)
      }
      if (search) {
        searchParams.set('search', search)
      }

      const raw = await apiClient.get(`/applications?${searchParams.toString()}`)
      const body = raw.data as { success: boolean; data?: unknown[]; meta?: { total: number; page: number; limit: number; totalPages: number }; error?: string }
      if (!body.success) {
        throw new Error(body.error ?? '申請一覧の取得に失敗しました')
      }
      const items = (body.data ?? []).map((item: unknown) => transformApplication(item as ApiApplicationDetail))
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

export function useRecentApplications(limit = 5) {
  return useQuery({
    queryKey: applicationKeys.list({ limit, recent: true }),
    queryFn: async (): Promise<PaginatedResponse<ExpenseApplication>> => {
      const raw = await apiClient.get(`/applications?limit=${limit}`)
      const body = raw.data as { success: boolean; data?: unknown[]; meta?: { total: number; page: number; limit: number; totalPages: number }; error?: string }
      if (!body.success) {
        throw new Error(body.error ?? '申請一覧の取得に失敗しました')
      }
      const items = (body.data ?? []).map((item: unknown) => transformApplication(item as ApiApplicationDetail))
      return {
        items,
        total: body.meta?.total ?? 0,
        page: body.meta?.page ?? 1,
        limit: body.meta?.limit ?? limit,
        totalPages: body.meta?.totalPages ?? 1,
      }
    },
  })
}

interface ApiApplicationDetail {
  readonly id: string
  readonly applicationNumber: string
  readonly memberId: string
  readonly member?: { readonly id: string; readonly memberId: string; readonly name: string }
  readonly status: string
  readonly expenseDate: string
  readonly amount: string | number
  readonly proposedAmount: string | number | null
  readonly finalAmount: string | number | null
  readonly description: string
  readonly internalCategoryId: string | null
  readonly internalCategory?: { readonly id: string; readonly name: string; readonly code: string } | null
  readonly isCashPayment: boolean
  readonly submittedAt: string | null
  readonly approvedAt: string | null
  readonly rejectedAt: string | null
  readonly approvedById: string | null
  readonly approvedBy?: { readonly id: string; readonly name: string } | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly receipts?: readonly unknown[]
  readonly comments?: readonly unknown[]
}

export function transformApplication(raw: ApiApplicationDetail): ExpenseApplication {
  return {
    id: raw.id,
    applicationNumber: raw.applicationNumber,
    memberId: raw.member?.memberId ?? raw.memberId,
    memberName: raw.member?.name ?? '',
    status: raw.status as ExpenseApplication['status'],
    expenseDate: raw.expenseDate,
    amount: Number(raw.amount),
    proposedAmount: raw.proposedAmount !== null ? Number(raw.proposedAmount) : null,
    finalAmount: raw.finalAmount !== null ? Number(raw.finalAmount) : null,
    description: raw.description,
    internalCategoryId: raw.internalCategoryId,
    internalCategoryName: raw.internalCategory?.name ?? null,
    isCashPayment: raw.isCashPayment,
    submittedAt: raw.submittedAt,
    approvedAt: raw.approvedAt,
    rejectedAt: raw.rejectedAt,
    approvedByName: raw.approvedBy?.name ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    receipts: (raw.receipts ?? []) as ExpenseApplication['receipts'],
    comments: ((raw.comments ?? []) as readonly Record<string, unknown>[]).map((c) => ({
      id: c.id as string,
      expenseApplicationId: c.expenseApplicationId as string,
      memberId: (c.member as Record<string, string>)?.memberId ?? (c.memberId as string),
      memberName: (c.member as Record<string, string>)?.name ?? '',
      comment: c.comment as string,
      commentType: (c.commentType ?? c.comment_type) as ApplicationComment['commentType'],
      createdAt: c.createdAt as string,
    })),
  }
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: async () => {
      const response = await apiGet<ApiApplicationDetail>(
        `/applications/${id}`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の取得に失敗しました')
      }
      return transformApplication(response.data)
    },
    enabled: Boolean(id),
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const response = await apiPost<ExpenseApplication>('/applications', {
        expense_date: data.expenseDate,
        amount: data.amount,
        description: data.description,
        is_cash_payment: data.isCashPayment,
      })
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
        {
          expense_date: data.expenseDate,
          amount: data.amount,
          description: data.description,
          is_cash_payment: data.isCashPayment,
        },
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? '申請の更新に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(id),
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

export function useUpdateOcrResult(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      receiptId,
      data,
    }: {
      readonly receiptId: string
      readonly data: {
        readonly extracted_date?: string
        readonly extracted_amount?: number
        readonly extracted_store_name?: string
      }
    }) => {
      const response = await apiPut<unknown>(
        `/applications/receipts/${receiptId}/ocr`,
        data,
      )
      if (!response.success) {
        throw new Error(response.error ?? 'OCR結果の更新に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(applicationId),
      })
    },
  })
}

export function useAddComment(applicationId: string) {
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
