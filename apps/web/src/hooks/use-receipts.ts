'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, apiDelete, apiPost, apiPut } from '@/lib/api-client'
import type { Receipt, OcrResult } from '@/lib/types'

export function useUploadReceipt(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await apiClient.post<{
        readonly success: boolean
        readonly data?: Receipt
        readonly error?: string
      }>(
        `/applications/${applicationId}/receipts`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      if (!response.data?.success || !response.data.data) {
        throw new Error(
          response.data?.error ?? '領収書のアップロードに失敗しました',
        )
      }
      return response.data.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['applications', 'detail', applicationId],
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
        queryKey: ['applications', 'detail', applicationId],
      })
    },
  })
}

export function useTriggerOcr(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (receiptId: string) => {
      const response = await apiPost<OcrResult>(
        `/applications/${applicationId}/receipts/${receiptId}/ocr`,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'OCR処理の開始に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['applications', 'detail', applicationId],
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
        readonly extractedDate?: string | null
        readonly extractedAmount?: string | null
        readonly extractedStoreName?: string | null
      }
    }) => {
      const response = await apiPut<OcrResult>(
        `/applications/${applicationId}/receipts/${receiptId}/ocr`,
        data,
      )
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'OCR結果の更新に失敗しました')
      }
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['applications', 'detail', applicationId],
      })
    },
  })
}
